import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity('outbox')
export class TypeormOutboxEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column("character varying", { name: 'destination_topic' })
  destinationTopic!: string;

  @Column("jsonb", { nullable: true })
  headers!: Record<string, string>;

  @Column("jsonb", { nullable: true })
  keys!: Record<string, unknown>;

  @Column("jsonb")
  payload!: Record<string, any>;
}
