import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("outbox_messages")
export class TypeormOutboxEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'status', default: 'pending' })
  status!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column("character varying", { name: "destination_topic" })
  destinationTopic!: string;

  @Column("jsonb", { nullable: true })
  headers!: Record<string, string>;

  @Column("jsonb", { nullable: true })
  keys!: Record<string, unknown>;

  @Column("jsonb")
  value!: Record<string, any>;
}
