import { Migration } from "@mikro-orm/migrations"

export class Migration20260508000000_Banner extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "banner" (
        "id" text not null,
        "title" text not null,
        "subtitle" text null,
        "button_text" text null,
        "button_link" text null,
        "image" text not null,
        "sort_order" integer not null default 0,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "banner_pkey" primary key ("id")
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "banner" cascade;`)
  }
}
