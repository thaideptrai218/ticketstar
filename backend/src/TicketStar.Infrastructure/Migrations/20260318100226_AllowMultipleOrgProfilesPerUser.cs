using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketStar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultipleOrgProfilesPerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // MySQL requires FK to be dropped before dropping the index it relies on
            migrationBuilder.DropForeignKey(
                name: "FK_OrganizerProfiles_Users_UserId",
                table: "OrganizerProfiles");

            migrationBuilder.DropIndex(
                name: "IX_OrganizerProfiles_UserId",
                table: "OrganizerProfiles");

            // Recreate as non-unique index (multiple orgs per user now allowed)
            migrationBuilder.CreateIndex(
                name: "IX_OrganizerProfiles_UserId",
                table: "OrganizerProfiles",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrganizerProfiles_Users_UserId",
                table: "OrganizerProfiles",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrganizerProfiles_Users_UserId",
                table: "OrganizerProfiles");

            migrationBuilder.DropIndex(
                name: "IX_OrganizerProfiles_UserId",
                table: "OrganizerProfiles");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerProfiles_UserId",
                table: "OrganizerProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OrganizerProfiles_Users_UserId",
                table: "OrganizerProfiles",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
