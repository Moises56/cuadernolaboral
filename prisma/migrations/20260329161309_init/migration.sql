-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'TEXTAREA', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('ACUERDO', 'CONTRATO');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER,
    "profession" TEXT,
    "workedForState" BOOLEAN NOT NULL DEFAULT false,
    "hasDemand" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "cvUrl" TEXT,
    "cvPublicId" TEXT,
    "photoUrl" TEXT,
    "photoPublicId" TEXT,
    "workPlace" TEXT,
    "contractType" "ContractType",
    "contractDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedPerson" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "RelatedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldConfig" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "options" TEXT[],
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormFieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicFieldValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "DynamicFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_dni_key" ON "Person"("dni");

-- CreateIndex
CREATE INDEX "Person_dni_idx" ON "Person"("dni");

-- CreateIndex
CREATE INDEX "Person_hasDemand_idx" ON "Person"("hasDemand");

-- CreateIndex
CREATE INDEX "Person_contractType_idx" ON "Person"("contractType");

-- CreateIndex
CREATE INDEX "Person_createdAt_idx" ON "Person"("createdAt");

-- CreateIndex
CREATE INDEX "Person_workPlace_idx" ON "Person"("workPlace");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedPerson_personId_key" ON "RelatedPerson"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldConfig_fieldKey_key" ON "FormFieldConfig"("fieldKey");

-- CreateIndex
CREATE INDEX "FormFieldConfig_active_order_idx" ON "FormFieldConfig"("active", "order");

-- CreateIndex
CREATE INDEX "DynamicFieldValue_personId_idx" ON "DynamicFieldValue"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicFieldValue_personId_fieldId_key" ON "DynamicFieldValue"("personId", "fieldId");

-- AddForeignKey
ALTER TABLE "RelatedPerson" ADD CONSTRAINT "RelatedPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicFieldValue" ADD CONSTRAINT "DynamicFieldValue_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicFieldValue" ADD CONSTRAINT "DynamicFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormFieldConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
