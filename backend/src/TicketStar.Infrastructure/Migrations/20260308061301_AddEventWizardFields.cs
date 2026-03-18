using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketStar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEventWizardFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "TicketTypes",
                type: "text",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "MaxPerUser",
                table: "TicketTypes",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<string>(
                name: "BannerImageUrl",
                table: "Events",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ContentWarning",
                table: "Events",
                type: "text",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsOnline",
                table: "Events",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxTicketsPerOrder",
                table: "Events",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentTerms",
                table: "Events",
                type: "text",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "RefundPolicy",
                table: "Events",
                type: "text",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "MaxPerUser",
                table: "TicketTypes");

            migrationBuilder.DropColumn(
                name: "BannerImageUrl",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "ContentWarning",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "IsOnline",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "MaxTicketsPerOrder",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "PaymentTerms",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "RefundPolicy",
                table: "Events");
        }
    }
}
