using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketStar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsOrganizerToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsOrganizer",
                table: "Users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsOrganizer",
                table: "Users");
        }
    }
}
