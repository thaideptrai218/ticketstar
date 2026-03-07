using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketStar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryAndLocationFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Events",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Events_Category",
                table: "Events",
                column: "Category");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Events_Category",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Events");
        }
    }
}
