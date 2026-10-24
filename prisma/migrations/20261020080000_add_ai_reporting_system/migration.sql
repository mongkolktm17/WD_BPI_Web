-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE IF NOT EXISTS "factory_context" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL DEFAULT 'wdbpi',
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factory_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_reports" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL DEFAULT 'wdbpi',
    "report_type" VARCHAR(20) NOT NULL,
    "report_date" DATE NOT NULL,
    "raw_metrics_json" JSONB NOT NULL,
    "ai_draft_text" TEXT NOT NULL,
    "human_final_text" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "approved_by" VARCHAR(100),
    "approved_at" TIMESTAMPTZ(6),
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "incident_logs_vector" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL DEFAULT 'wdbpi',
    "incident_date" DATE NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_logs_vector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_feedback_rules" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(50) NOT NULL DEFAULT 'wdbpi',
    "report_id" INTEGER,
    "rating" VARCHAR(10) NOT NULL,
    "feedback_comment" TEXT,
    "extracted_rule" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_feedback_rules_report_id_fkey') THEN
        ALTER TABLE "ai_feedback_rules" ADD CONSTRAINT "ai_feedback_rules_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "ai_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS "idx_factory_context_tenant_cat" ON "factory_context"("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "idx_ai_reports_tenant_type_date" ON "ai_reports"("tenant_id", "report_type", "report_date");
CREATE INDEX IF NOT EXISTS "idx_ai_reports_status" ON "ai_reports"("status");
CREATE INDEX IF NOT EXISTS "idx_ai_feedback_rules_active" ON "ai_feedback_rules"("tenant_id", "is_active");
