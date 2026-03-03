using MassTransit;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using TicketStar.Application.Options;

namespace TicketStar.API.Extensions;

public static class MassTransitExtensions
{
    public static IServiceCollection AddMassTransitWithRabbitMQ(
        this IServiceCollection services, IConfiguration config, IHealthChecksBuilder? healthChecksBuilder = null)
    {
        var rabbitMqSection = config.GetSection("RabbitMQ");
        var host = rabbitMqSection["Host"] ?? "localhost";
        var port = rabbitMqSection.GetValue<int>("Port", 5672);
        var username = rabbitMqSection["Username"] ?? "guest";
        var password = rabbitMqSection["Password"] ?? "guest";
        var virtualHost = rabbitMqSection["VirtualHost"] ?? "/";

        services.AddMassTransit(x =>
        {
            // Consumers will be registered in Phase 8
            // x.AddConsumer<OrderConfirmationConsumer>();

            x.UsingRabbitMq((context, cfg) =>
            {
                cfg.Host($"rabbitmq://{username}:{password}@{host}:{port}{virtualHost}");

                cfg.ConfigureEndpoints(context);
            });
        });

        // Health check for RabbitMQ - add to existing builder if provided
        if (healthChecksBuilder != null)
        {
            healthChecksBuilder.AddRabbitMQ(
                rabbitConnectionString: $"amqp://{username}:{password}@{host}:{port}{virtualHost}",
                name: "rabbitmq",
                failureStatus: HealthStatus.Degraded,
                tags: new[] { "infra", "ready" });
        }

        return services;
    }
}
