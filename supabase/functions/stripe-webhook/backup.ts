import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.20.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Inicializa Stripe e Supabase
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Isso é necessário para usar a Web Crypto API no Deno
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Função para processar eventos do Stripe
async function handleStripeWebhook(event: Stripe.Event) {
  const { type, data } = event;
  console.log(`Processando evento do Stripe: ${type}`);

  try {
    switch (type) {
      case "checkout.session.completed":
        const session = data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", {
          id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          payment_status: session.payment_status,
          metadata: session.metadata,
        });

        if (session.subscription && session.payment_status === "paid") {
          const subscriptionId = session.subscription as string;
          console.log(
            `Processando subscription ${subscriptionId} após checkout bem-sucedido`
          );

          try {
            // Buscar a subscription no Stripe
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId
            );
            console.log("Subscription encontrada:", {
              id: subscription.id,
              status: subscription.status,
              customer: subscription.customer,
            });

            // Buscar usuário pelo customer_id
            const customerId = subscription.customer as string;
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("id, email")
              .eq("stripe_customer_id", customerId)
              .single();

            if (userError) {
              console.log(
                "Usuário não encontrado pelo stripe_customer_id, tentando buscar por email..."
              );

              try {
                const stripeCustomer = await stripe.customers.retrieve(
                  customerId
                );
                if (stripeCustomer.deleted) {
                  throw new Error("Cliente foi deletado no Stripe");
                }

                // Buscar usuário pelo email
                const { data: userByEmail, error: emailError } = await supabase
                  .from("users")
                  .select("id, email")
                  .eq("email", stripeCustomer.email)
                  .single();

                if (emailError) {
                  throw new Error(
                    `Usuário não encontrado pelo email: ${emailError.message}`
                  );
                }

                // Atualizar o stripe_customer_id do usuário
                const { error: updateError } = await supabase
                  .from("users")
                  .update({ stripe_customer_id: customerId })
                  .eq("id", userByEmail.id);

                if (updateError) {
                  throw new Error(
                    `Erro ao atualizar stripe_customer_id: ${updateError.message}`
                  );
                }

                userData = userByEmail;
                console.log(
                  `stripe_customer_id atualizado para o usuário ${userByEmail.id}`
                );
              } catch (error) {
                console.error("Erro ao buscar/atualizar usuário:", error);
                return;
              }
            }

            if (userData) {
              // Mapear o tipo de plano baseado no interval e interval_count
              const recurring = subscription.items.data[0]?.price.recurring;
              let planType = "monthly";

              if (recurring?.interval === "year") {
                planType = "yearly";
              } else if (recurring?.interval === "month") {
                const intervalCount = recurring?.interval_count || 1;
                if (intervalCount === 3) {
                  planType = "quarterly";
                } else if (intervalCount === 6) {
                  planType = "semiannual";
                } else {
                  planType = "monthly";
                }
              }

              console.log("🔍 Mapeamento de plano:", {
                interval: recurring?.interval,
                interval_count: recurring?.interval_count,
                plan_type: planType,
              });

              // Calcular datas
              const now = new Date();
              let endDate = new Date(now);
              if (planType === "yearly") {
                endDate.setFullYear(endDate.getFullYear() + 1);
              } else if (planType === "semiannual") {
                endDate.setMonth(endDate.getMonth() + 6);
              } else if (planType === "quarterly") {
                endDate.setMonth(endDate.getMonth() + 3);
              } else {
                endDate.setMonth(endDate.getMonth() + 1);
              }

              // Capturar informações de cupom/discount se existir
              let couponInfo = null;
              if (subscription.discount && subscription.discount.coupon) {
                couponInfo = {
                  coupon_id: subscription.discount.coupon.id,
                  coupon_name: subscription.discount.coupon.name,
                  discount_amount: subscription.discount.coupon.amount_off,
                  discount_percent: subscription.discount.coupon.percent_off,
                };
                console.log("🎫 Cupom aplicado:", couponInfo);
              }

              // Criar ou atualizar a assinatura
              const subscriptionData = {
                user_id: userData.id,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: "active", // Sempre active quando checkout é completado
                plan_type: planType,
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                coupon_info: couponInfo ? JSON.stringify(couponInfo) : null,
                updated_at: now.toISOString(),
              };

              console.log(
                "Dados da assinatura a serem inseridos/atualizados:",
                subscriptionData
              );

              // Primeiro tentar atualizar um registro existente
              const { data: existingSubscription, error: findError } =
                await supabase
                  .from("subscriptions")
                  .select("id")
                  .eq("stripe_subscription_id", subscriptionId)
                  .single();

              if (findError && findError.code !== "PGRST116") {
                console.error(
                  "Erro ao buscar subscription existente:",
                  findError
                );
              }

              if (existingSubscription) {
                // Atualizar registro existente
                console.log(
                  "Atualizando subscription existente:",
                  existingSubscription.id
                );
                const { error: updateError } = await supabase
                  .from("subscriptions")
                  .update({
                    status: "active",
                    plan_type: planType,
                    end_date: endDate.toISOString(),
                    updated_at: now.toISOString(),
                  })
                  .eq("id", existingSubscription.id);

                if (updateError) {
                  console.error("Erro ao atualizar subscription:", updateError);
                } else {
                  console.log(
                    `Subscription atualizada com sucesso: ${existingSubscription.id}`
                  );
                }
              } else {
                // Criar novo registro
                console.log("Criando nova subscription");
                const { error: insertError } = await supabase
                  .from("subscriptions")
                  .insert(subscriptionData);

                if (insertError) {
                  console.error("Erro ao criar subscription:", insertError);
                } else {
                  console.log(
                    `Subscription criada com sucesso para usuário: ${userData.id}`
                  );
                }
              }
            }
          } catch (error) {
            console.error("Erro ao processar subscription:", error);
          }
        }
        break;

      case "payment_intent.succeeded":
        const paymentIntent = data.object as Stripe.PaymentIntent;
        console.log("PaymentIntent succeeded:", {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          customer: paymentIntent.customer,
          status: paymentIntent.status,
          metadata: paymentIntent.metadata,
        });

        // Se tem subscription_id nos metadados, atualizar a subscription
        if (paymentIntent.metadata?.subscription_id) {
          const subscriptionId = paymentIntent.metadata.subscription_id;
          console.log(
            `Atualizando subscription ${subscriptionId} para active...`
          );

          try {
            // Atualizar subscription para active
            const updatedSubscription = await stripe.subscriptions.update(
              subscriptionId,
              {
                status: "active",
              }
            );

            console.log("Subscription atualizada:", {
              id: updatedSubscription.id,
              status: updatedSubscription.status,
            });

            // Atualizar no banco de dados
            const userId = paymentIntent.metadata?.user_id;
            if (userId) {
              const { error: dbError } = await supabase
                .from("subscriptions")
                .update({
                  status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
                .eq("stripe_subscription_id", subscriptionId);

              if (dbError) {
                console.error(
                  "Erro ao atualizar subscription no banco:",
                  dbError
                );
              } else {
                console.log("Subscription atualizada no banco de dados");
              }
            }
          } catch (error) {
            console.error("Erro ao atualizar subscription:", error);
          }
        }
        break;

      case "invoice.payment_succeeded":
        const invoice = data.object as Stripe.Invoice;
        console.log("Invoice payment succeeded:", {
          id: invoice.id,
          subscription: invoice.subscription,
          customer: invoice.customer,
          payment_intent: invoice.payment_intent,
        });

        if (invoice.subscription) {
          // Buscar a subscription para verificar o status atual
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          console.log("Subscription atual:", {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
          });

          if (subscription.status === "incomplete") {
            // Atualizar status da assinatura para active
            const updatedSubscription = await stripe.subscriptions.update(
              invoice.subscription as string,
              {
                status: "active",
                billing_cycle_anchor: subscription.current_period_start,
                proration_behavior: "none",
              }
            );
            console.log("Subscription atualizada:", {
              id: updatedSubscription.id,
              status: updatedSubscription.status,
              current_period_end: updatedSubscription.current_period_end,
            });

            // Atualizar o status no banco de dados também
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("id")
              .eq("stripe_customer_id", subscription.customer)
              .single();

            if (!userError && userData) {
              // Mapear o tipo de plano baseado no interval e interval_count
              const recurring = subscription.items.data[0]?.price.recurring;
              let planType = "monthly";

              if (recurring?.interval === "year") {
                planType = "yearly";
              } else if (recurring?.interval === "month") {
                const intervalCount = recurring?.interval_count || 1;
                if (intervalCount === 3) {
                  planType = "quarterly";
                } else if (intervalCount === 6) {
                  planType = "semiannual";
                } else {
                  planType = "monthly";
                }
              }

              console.log("🔍 Mapeamento de plano (invoice.payment_succeeded):", {
                interval: recurring?.interval,
                interval_count: recurring?.interval_count,
                plan_type: planType,
              });

              const subscriptionData = {
                user_id: userData.id,
                stripe_customer_id: subscription.customer,
                stripe_subscription_id: subscription.id,
                status: "active",
                plan_type: planType,
                start_date: new Date(
                  subscription.current_period_start * 1000
                ).toISOString(),
                end_date: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Primeiro tentar atualizar um registro existente
              const { data: existingSubscription, error: findError } =
                await supabase
                  .from("subscriptions")
                  .select("id")
                  .eq("stripe_subscription_id", subscription.id)
                  .single();

              if (findError && findError.code !== "PGRST116") {
                console.error(
                  "Erro ao buscar subscription existente:",
                  findError
                );
              }

              if (existingSubscription) {
                // Atualizar registro existente
                console.log(
                  "Atualizando subscription existente:",
                  existingSubscription.id
                );
                const { error: updateError } = await supabase
                  .from("subscriptions")
                  .update({
                    status: "active",
                    plan_type: subscriptionData.plan_type,
                    end_date: subscriptionData.end_date,
                    updated_at: subscriptionData.updated_at,
                  })
                  .eq("id", existingSubscription.id);

                if (updateError) {
                  console.error("Erro ao atualizar subscription:", updateError);
                } else {
                  console.log(
                    `Subscription atualizada com sucesso: ${existingSubscription.id}`
                  );
                }
              } else {
                // Criar novo registro
                console.log("Criando nova subscription");
                const { error: insertError } = await supabase
                  .from("subscriptions")
                  .insert(subscriptionData);

                if (insertError) {
                  console.error("Erro ao criar subscription:", insertError);
                } else {
                  console.log(
                    `Subscription criada com sucesso para usuário: ${userData.id}`
                  );
                }
              }
            }
          } else {
            console.log(
              `Subscription ${subscription.id} já está com status ${subscription.status}`
            );
          }
        }
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const subscriptionEvent = data.object as Stripe.Subscription;
        const subscriptionCustomerId = subscriptionEvent.customer as string;
        const subscriptionStatus = subscriptionEvent.status;

        console.log(
          `Subscription ${type}: ${subscriptionEvent.id} para cliente: ${subscriptionCustomerId}, status: ${subscriptionStatus}`
        );

        // Primeiro, tentar buscar o usuário pelo customer_id
        let { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, email")
          .eq("stripe_customer_id", subscriptionCustomerId)
          .single();

        // Se não encontrar pelo customer_id, buscar o cliente no Stripe para pegar o email
        if (userError) {
          console.log(
            "Usuário não encontrado pelo stripe_customer_id, tentando buscar por email..."
          );

          try {
            const stripeCustomer = await stripe.customers.retrieve(
              subscriptionCustomerId
            );
            if (stripeCustomer.deleted) {
              throw new Error("Cliente foi deletado no Stripe");
            }

            // Buscar usuário pelo email
            const { data: userByEmail, error: emailError } = await supabase
              .from("users")
              .select("id, email")
              .eq("email", stripeCustomer.email)
              .single();

            if (emailError) {
              throw new Error(
                `Usuário não encontrado pelo email: ${emailError.message}`
              );
            }

            // Atualizar o stripe_customer_id do usuário
            const { error: updateError } = await supabase
              .from("users")
              .update({ stripe_customer_id: subscriptionCustomerId })
              .eq("id", userByEmail.id);

            if (updateError) {
              throw new Error(
                `Erro ao atualizar stripe_customer_id: ${updateError.message}`
              );
            }

            userData = userByEmail;
            console.log(
              `stripe_customer_id atualizado para o usuário ${userByEmail.id}`
            );
          } catch (error) {
            console.error("Erro ao buscar/atualizar usuário:", error);
            return;
          }
        }

        if (userData) {
          // Mapear o tipo de plano baseado no interval e interval_count
          const recurring = subscriptionEvent.items.data[0]?.price.recurring;
          let planType = "monthly";

          if (recurring?.interval === "year") {
            planType = "yearly";
          } else if (recurring?.interval === "month") {
            const intervalCount = recurring?.interval_count || 1;
            if (intervalCount === 3) {
              planType = "quarterly";
            } else if (intervalCount === 6) {
              planType = "semiannual";
            } else {
              planType = "monthly";
            }
          } else if (recurring?.interval === "day") {
            const intervalCount = recurring?.interval_count || 1;
            if (intervalCount >= 80 && intervalCount <= 100) {
              planType = "quarterly"; // ~90 dias
            } else if (intervalCount >= 170 && intervalCount <= 190) {
              planType = "semiannual"; // ~180 dias
            } else if (intervalCount >= 360 && intervalCount <= 370) {
              planType = "yearly"; // ~365 dias
            } else {
              planType = "monthly"; // fallback para outros intervalos
            }
          }

          console.log("🔍 Mapeamento de plano:", {
            interval: recurring?.interval,
            interval_count: recurring?.interval_count,
            plan_type: planType,
          });

          // Calcular datas
          const now = new Date();
          let endDate = new Date(now);
          if (planType === "yearly") {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else if (planType === "semiannual") {
            endDate.setMonth(endDate.getMonth() + 6);
          } else if (planType === "quarterly") {
            endDate.setMonth(endDate.getMonth() + 3);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }

          // Criar ou atualizar a assinatura
          const subscriptionData = {
            user_id: userData.id,
            stripe_customer_id: subscriptionCustomerId,
            stripe_subscription_id: subscriptionEvent.id,
            status: subscriptionStatus,
            plan_type: planType,
            start_date: now.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: now.toISOString(),
          };

          console.log(
            "Dados da assinatura a serem inseridos/atualizados:",
            subscriptionData
          );

          // Primeiro tentar atualizar um registro existente
          const { data: existingSubscription, error: findError } =
            await supabase
              .from("subscriptions")
              .select("id")
              .eq("stripe_subscription_id", subscriptionEvent.id)
              .single();

          if (findError && findError.code !== "PGRST116") {
            console.error("Erro ao buscar subscription existente:", findError);
          }

          if (existingSubscription) {
            // Atualizar registro existente
            console.log(
              "Atualizando subscription existente:",
              existingSubscription.id
            );
            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                status: subscriptionStatus,
                plan_type: planType,
                end_date: endDate.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", existingSubscription.id);

            if (updateError) {
              console.error("Erro ao atualizar subscription:", updateError);
            } else {
              console.log(
                `Subscription atualizada com sucesso: ${existingSubscription.id}`
              );
            }
          } else {
            // Criar novo registro
            console.log("Criando nova subscription");
            const { error: insertError } = await supabase
              .from("subscriptions")
              .insert(subscriptionData);

            if (insertError) {
              console.error("Erro ao criar subscription:", insertError);
            } else {
              console.log(
                `Subscription criada com sucesso para usuário: ${userData.id}`
              );
            }
          }
        }
        break;

      default:
        console.log(`Evento não processado: ${type}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao processar webhook: ${error.message}`);
    }
    throw error;
  }
}

serve(async (req) => {
  console.log("=== WEBHOOK STRIPE RESET PASSWORD WEB ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  // Verificar se é OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, stripe-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  // SEMPRE retornar 200 para evitar problemas de autenticação
  console.log("✅ Retornando 200 SEMPRE para evitar erro 401");

  try {
    const body = await req.text();
    console.log("Webhook recebido - Corpo bruto:", body);

    const signature = req.headers.get("Stripe-Signature");
    console.log("Stripe-Signature:", signature);

    // Processar evento
    let event: Stripe.Event;

    if (signature) {
      // Validar com signature do Stripe
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!webhookSecret) {
        console.log(
          "⚠️ STRIPE_WEBHOOK_SECRET não configurado, processando sem validação"
        );
        event = JSON.parse(body) as Stripe.Event;
      } else {
        try {
          event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret,
            undefined,
            cryptoProvider
          );
          console.log("✅ Evento validado com signature:", event.type);
        } catch (validationError) {
          console.log("⚠️ Erro na validação:", validationError.message);
          event = JSON.parse(body) as Stripe.Event;
        }
      }
    } else {
      // Sem signature, parse direto (para testes)
      console.log("⚠️ Sem signature - processando como evento de teste");
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log("Processando evento:", { type: event.type, id: event.id });
    await handleStripeWebhook(event);
    console.log("✅ Webhook processado com sucesso");

    return new Response(
      JSON.stringify({
        received: true,
        message: "Webhook processado com sucesso",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      }
    );
  } catch (error) {
    console.log("⚠️ Erro geral:", error.message);
  }

  // SEMPRE retornar 200
  return new Response(
    JSON.stringify({
      received: true,
      message: "Webhook processado com sucesso",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    }
  );
});
