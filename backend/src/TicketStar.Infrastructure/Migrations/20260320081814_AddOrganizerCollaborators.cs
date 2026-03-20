using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketStar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizerCollaborators : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizerCollaborators",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(450)", maxLength: 450, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UserId = table.Column<string>(type: "varchar(450)", maxLength: 450, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    OrganizerProfileId = table.Column<string>(type: "varchar(450)", maxLength: 450, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PermissionLevel = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    InviteToken = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    InvitedBy = table.Column<string>(type: "varchar(450)", maxLength: 450, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    InvitedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    AcceptedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizerCollaborators", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizerCollaborators_OrganizerProfiles_OrganizerProfileId",
                        column: x => x.OrganizerProfileId,
                        principalTable: "OrganizerProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrganizerCollaborators_Users_InvitedBy",
                        column: x => x.InvitedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrganizerCollaborators_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerCollaborators_Email_OrganizerProfileId",
                table: "OrganizerCollaborators",
                columns: new[] { "Email", "OrganizerProfileId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerCollaborators_InvitedBy",
                table: "OrganizerCollaborators",
                column: "InvitedBy");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerCollaborators_InviteToken",
                table: "OrganizerCollaborators",
                column: "InviteToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerCollaborators_OrganizerProfileId",
                table: "OrganizerCollaborators",
                column: "OrganizerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerCollaborators_UserId_OrganizerProfileId",
                table: "OrganizerCollaborators",
                columns: new[] { "UserId", "OrganizerProfileId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizerCollaborators");
        }
    }
}
