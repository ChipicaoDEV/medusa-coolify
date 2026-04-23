import { Migration } from "@mikro-orm/migrations"

export class Migration20260423000000_QuoteRequest extends Migration {

  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "quote_request" (' +
      '"id" text not null,' +
      '"product_id" text not null,' +
      '"product_title" text not null,' +
      '"variant_id" text null,' +
      '"quantity" integer not null,' +
      '"delivery_type" text not null,' +
      '"full_name" text not null,' +
      '"phone" text not null,' +
      '"email" text not null,' +
      '"address" text null,' +
      '"status" text not null default \'new\',' +
      '"created_at" timestamptz not null default now(),' +
      '"updated_at" timestamptz not null default now(),' +
      '"deleted_at" timestamptz null,' +
      'constraint "quote_request_pkey" primary key ("id")' +
      ');'
    )
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "quote_request";')
  }

}
