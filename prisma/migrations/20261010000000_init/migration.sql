-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(60) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `role` ENUM('OWNER', 'MANAGER', 'STAFF', 'ACCOUNTANT') NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `pinHash` VARCHAR(100) NULL,
    `totpSecretEnc` VARCHAR(255) NULL,
    `lang` VARCHAR(5) NOT NULL DEFAULT 'en',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `device` VARCHAR(255) NULL,
    `ip` VARCHAR(45) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Counter` (
    `key` VARCHAR(100) NOT NULL,
    `nextValue` INTEGER NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `File` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(30) NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `mime` VARCHAR(80) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessDate` DATE NULL,
    `userId` VARCHAR(191) NULL,
    `userRole` VARCHAR(20) NULL,
    `sessionId` VARCHAR(40) NULL,
    `device` VARCHAR(255) NULL,
    `ip` VARCHAR(45) NULL,
    `module` VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    `entityType` VARCHAR(60) NOT NULL,
    `entityId` VARCHAR(40) NOT NULL,
    `parentEntityType` VARCHAR(60) NULL,
    `parentEntityId` VARCHAR(40) NULL,
    `action` VARCHAR(60) NOT NULL,
    `severity` VARCHAR(10) NOT NULL DEFAULT 'INFO',
    `before` JSON NULL,
    `after` JSON NULL,
    `diff` JSON NULL,
    `reasonCode` VARCHAR(40) NULL,
    `reasonText` VARCHAR(255) NULL,
    `pinUsedBy` VARCHAR(40) NULL,
    `correlationId` VARCHAR(40) NULL,
    `rateSnapshotId` VARCHAR(40) NULL,
    `idempotencyKeyRef` VARCHAR(64) NULL,
    `source` VARCHAR(10) NOT NULL DEFAULT 'UI',
    `prevHash` CHAR(64) NULL,
    `hash` CHAR(64) NULL,
    `legacy` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ActivityLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `ActivityLog_userId_at_idx`(`userId`, `at`),
    INDEX `ActivityLog_correlationId_idx`(`correlationId`),
    INDEX `ActivityLog_module_at_idx`(`module`, `at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertRule` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `module` VARCHAR(30) NOT NULL,
    `kind` VARCHAR(15) NOT NULL,
    `paramsJson` JSON NOT NULL,
    `severity` VARCHAR(10) NOT NULL,
    `audienceJson` JSON NOT NULL,
    `channelsJson` JSON NOT NULL,
    `dedupeKeyExpr` VARCHAR(120) NULL,
    `autoResolveExpr` VARCHAR(120) NULL,
    `escalateAfterMin` INTEGER NULL,
    `manualResolve` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `AlertRule_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertInstance` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(60) NOT NULL,
    `entityId` VARCHAR(40) NOT NULL,
    `dedupeKey` VARCHAR(120) NOT NULL,
    `severity` VARCHAR(10) NOT NULL,
    `firstRaisedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `occurrences` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(15) NOT NULL DEFAULT 'OPEN',
    `ackById` VARCHAR(191) NULL,
    `ackAt` DATETIME(3) NULL,
    `snoozeUntil` DATETIME(3) NULL,
    `note` VARCHAR(255) NULL,
    `payloadJson` JSON NULL,
    `rateSnapshotId` VARCHAR(40) NULL,

    INDEX `AlertInstance_status_severity_idx`(`status`, `severity`),
    INDEX `AlertInstance_entityType_entityId_idx`(`entityType`, `entityId`),
    UNIQUE INDEX `AlertInstance_ruleId_dedupeKey_status_key`(`ruleId`, `dedupeKey`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdempotencyKey` (
    `key` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `route` VARCHAR(120) NOT NULL,
    `status` VARCHAR(12) NOT NULL,
    `responseJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Draft` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(64) NOT NULL,
    `formType` VARCHAR(40) NOT NULL,
    `formKey` VARCHAR(80) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Draft_userId_formType_formKey_key`(`userId`, `formType`, `formKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `nameHindi` VARCHAR(120) NULL,
    `phone` VARCHAR(15) NOT NULL,
    `altPhone` VARCHAR(15) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED') NOT NULL DEFAULT 'UNSPECIFIED',
    `dob` DATE NULL,
    `relationType` ENUM('FATHER', 'MOTHER', 'HUSBAND', 'SELF', 'OTHER') NOT NULL DEFAULT 'FATHER',
    `relationName` VARCHAR(120) NULL,
    `occupation` VARCHAR(80) NULL,
    `address` TEXT NULL,
    `permanentAddress` TEXT NULL,
    `locality` VARCHAR(80) NULL,
    `city` VARCHAR(60) NOT NULL DEFAULT 'Local',
    `pincode` VARCHAR(10) NULL,
    `photoUrl` VARCHAR(255) NULL,
    `photoDriveUrl` VARCHAR(255) NULL,
    `identityDocType` VARCHAR(30) NULL,
    `identityDocNumber` VARCHAR(50) NULL,
    `identityDocPhotoUrl` VARCHAR(255) NULL,
    `secondaryContactName` VARCHAR(120) NULL,
    `secondaryContactPhone` VARCHAR(15) NULL,
    `secondaryContactRelation` VARCHAR(40) NULL,
    `searchKey` VARCHAR(200) NULL,
    `tag` ENUM('STANDARD', 'VIP', 'RISK', 'BLOCKED', 'HAS_REPLEDGED', 'PAID_AWAITING_RELEASE', 'MANUAL_INTEREST', 'SETTLED_BY_REPLEDGE', 'RATE_OPEN', 'RATE_PARTLY_FIXED', 'SETTLEMENT_DUE', 'COST_REVISED') NOT NULL DEFAULT 'STANDARD',
    `creditLimitPaise` BIGINT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_phone_idx`(`phone`),
    INDEX `Customer_name_idx`(`name`),
    INDEX `Customer_nameHindi_idx`(`nameHindi`),
    INDEX `Customer_searchKey_idx`(`searchKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyRate` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL,
    `purityPpt` INTEGER NOT NULL,
    `ratePaisePerGram` BIGINT NOT NULL,
    `sellRatePaisePerGram` BIGINT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DailyRate_date_idx`(`date`),
    UNIQUE INDEX `DailyRate_date_metal_purityPpt_key`(`date`, `metal`, `purityPpt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `versionNo` INTEGER NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL,
    `enteredByUserId` VARCHAR(191) NOT NULL,
    `gold24Paise` BIGINT NOT NULL,
    `gold22Paise` BIGINT NOT NULL,
    `gold18Paise` BIGINT NULL,
    `gold14Paise` BIGINT NULL,
    `silver999Paise` BIGINT NOT NULL,
    `silver925Paise` BIGINT NULL,
    `buyAdjustBp` INTEGER NULL,
    `sellAdjustBp` INTEGER NULL,
    `source` VARCHAR(10) NOT NULL DEFAULT 'MANUAL',
    `correctionOfId` VARCHAR(191) NULL,
    `note` VARCHAR(255) NULL,
    `rateFlags` VARCHAR(80) NULL,

    INDEX `RateSnapshot_shopId_effectiveAt_idx`(`shopId`, `effectiveAt`),
    UNIQUE INDEX `RateSnapshot_shopId_versionNo_key`(`shopId`, `versionNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `tagNo` VARCHAR(30) NOT NULL,
    `sku` VARCHAR(60) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL,
    `purityPpt` INTEGER NOT NULL DEFAULT 916,
    `category` VARCHAR(60) NOT NULL,
    `grossWeightMg` INTEGER NOT NULL,
    `stoneWeightMg` INTEGER NOT NULL DEFAULT 0,
    `netWeightMg` INTEGER NOT NULL,
    `makingType` ENUM('PER_GRAM', 'PERCENT', 'FLAT') NOT NULL DEFAULT 'PER_GRAM',
    `makingValuePaise` BIGINT NOT NULL DEFAULT 0,
    `huid` VARCHAR(30) NULL,
    `status` ENUM('IN_STOCK', 'ON_HOLD', 'SOLD', 'WITH_KARIGAR', 'RETURNED', 'DAMAGED', 'PLEDGED', 'RESERVED_ORDER', 'ON_TRAY', 'ON_APPROVAL', 'IN_REPAIR_STAGE', 'RETURNED_TO_VENDOR', 'MELTED', 'LOST') NOT NULL DEFAULT 'IN_STOCK',
    `photoUrl` VARCHAR(255) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `itemClass` ENUM('METAL_JEWELLERY', 'STONE_LOOSE', 'NON_METAL', 'COMPONENT', 'PACKAGING', 'SERVICE', 'CUSTOMER_PROPERTY') NOT NULL DEFAULT 'METAL_JEWELLERY',
    `trackingMode` ENUM('UNIQUE', 'PACK', 'COUNT', 'BULK_WEIGHT') NOT NULL DEFAULT 'UNIQUE',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `piecesPerPack` INTEGER NULL,
    `packTareMg` INTEGER NULL,
    `netRemainingMg` INTEGER NULL,
    `openedUnits` INTEGER NULL,
    `reorderLevel` INTEGER NULL,
    `reorderQty` INTEGER NULL,
    `preferredVendorId` VARCHAR(191) NULL,
    `hsn` VARCHAR(20) NULL,
    `gstRateBp` INTEGER NULL,
    `costPaise` BIGINT NULL,
    `costRateSnapshotId` VARCHAR(191) NULL,
    `rateSnapshotId` VARCHAR(191) NULL,
    `isDisplayOnly` BOOLEAN NOT NULL DEFAULT false,
    `attributesJson` JSON NULL,
    `ownership` ENUM('OWNED', 'MEMO_IN') NOT NULL DEFAULT 'OWNED',
    `memoInLineId` VARCHAR(191) NULL,

    UNIQUE INDEX `InventoryItem_tagNo_key`(`tagNo`),
    INDEX `InventoryItem_tagNo_idx`(`tagNo`),
    INDEX `InventoryItem_status_metal_idx`(`status`, `metal`),
    INDEX `InventoryItem_ownership_status_idx`(`ownership`, `status`),
    INDEX `InventoryItem_itemClass_status_idx`(`itemClass`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNo` VARCHAR(24) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `date` DATE NOT NULL,
    `gstEnabled` BOOLEAN NOT NULL DEFAULT true,
    `subtotalPaise` BIGINT NOT NULL,
    `discountPaise` BIGINT NOT NULL,
    `taxablePaise` BIGINT NOT NULL,
    `gstPaise` BIGINT NOT NULL,
    `roundOffPaise` BIGINT NOT NULL,
    `oldGoldAdjPaise` BIGINT NOT NULL DEFAULT 0,
    `totalPaise` BIGINT NOT NULL,
    `paidPaise` BIGINT NOT NULL,
    `creditId` VARCHAR(191) NULL,
    `status` ENUM('COMPLETED', 'CANCELLED', 'RETURNED', 'PARTIAL_RETURN') NOT NULL DEFAULT 'COMPLETED',
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Sale_invoiceNo_key`(`invoiceNo`),
    UNIQUE INDEX `Sale_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Sale_customerId_date_idx`(`customerId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NULL,
    `tagNo` VARCHAR(30) NULL,
    `name` VARCHAR(120) NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL,
    `purityPpt` INTEGER NOT NULL,
    `grossWeightMg` INTEGER NOT NULL,
    `netWeightMg` INTEGER NOT NULL,
    `ratePaisePerGram` BIGINT NOT NULL,
    `metalValuePaise` BIGINT NOT NULL,
    `makingType` ENUM('PER_GRAM', 'PERCENT', 'FLAT') NOT NULL DEFAULT 'PER_GRAM',
    `makingValuePaise` BIGINT NOT NULL DEFAULT 0,
    `makingChargePaise` BIGINT NOT NULL DEFAULT 0,
    `totalPaise` BIGINT NOT NULL,

    INDEX `SaleItem_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GirviLoan` (
    `id` VARCHAR(191) NOT NULL,
    `loanNo` VARCHAR(24) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `dueDate` DATE NULL,
    `principalPaise` BIGINT NOT NULL,
    `interestRatePerMonthPct` DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
    `status` ENUM('ACTIVE', 'PARTIAL', 'OVERDUE', 'REDEEMED', 'FORFEITED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GirviLoan_loanNo_key`(`loanNo`),
    INDEX `GirviLoan_customerId_status_idx`(`customerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GirviItem` (
    `id` VARCHAR(191) NOT NULL,
    `girviLoanId` VARCHAR(191) NOT NULL,
    `ornamentType` VARCHAR(80) NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL DEFAULT 'GOLD',
    `purity` VARCHAR(20) NOT NULL DEFAULT '22K',
    `grossWeightMg` INTEGER NOT NULL,
    `stoneWeightMg` INTEGER NOT NULL DEFAULT 0,
    `netWeightMg` INTEGER NOT NULL,
    `valuationPaise` BIGINT NOT NULL,
    `locationId` VARCHAR(191) NULL,

    INDEX `GirviItem_girviLoanId_idx`(`girviLoanId`),
    INDEX `GirviItem_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FundAccount` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `name` VARCHAR(80) NOT NULL,
    `type` ENUM('CASH', 'BANK') NOT NULL,
    `bankName` VARCHAR(80) NULL,
    `accountLast4` VARCHAR(4) NULL,
    `upiId` VARCHAR(80) NULL,
    `acceptsModes` JSON NOT NULL,
    `isDefaultUpi` BOOLEAN NOT NULL DEFAULT false,
    `openingPaise` BIGINT NOT NULL DEFAULT 0,
    `openingDate` DATE NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FundAccount_type_active_idx`(`type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashCategory` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `name` VARCHAR(60) NOT NULL,
    `nameHi` VARCHAR(60) NULL,
    `group` ENUM('OPERATING', 'GIRVI', 'METAL', 'FINANCING', 'TRANSFER') NOT NULL,
    `direction` VARCHAR(4) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `isPersonal` BOOLEAN NOT NULL DEFAULT false,
    `pnl` VARCHAR(8) NOT NULL DEFAULT 'NONE',
    `monthlyBudgetPaise` BIGINT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `CashCategory_shopId_name_parentId_key`(`shopId`, `name`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashCategoryMap` (
    `id` VARCHAR(191) NOT NULL,
    `refType` VARCHAR(20) NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `eventType` VARCHAR(24) NULL,
    `flowKind` ENUM('SALE_RECEIPT', 'CREDIT_COLLECTION', 'GIRVI_LOAN_OUT', 'GIRVI_INTEREST_IN', 'GIRVI_PRINCIPAL_IN', 'OLD_GOLD_PAYOUT', 'ORDER_ADVANCE', 'REPAIR_RECEIPT', 'SCHEME_INSTALMENT', 'VENDOR_PAYMENT', 'KARIGAR_LABOUR', 'EXPENSE', 'OTHER_INCOME', 'TRANSFER', 'OWNER_CAPITAL', 'OWNER_DRAWING', 'LOAN_TAKEN', 'LOAN_REPAID', 'CASH_ADJUSTMENT', 'OPENING_BALANCE', 'REFUND', 'REPLEDGE_LOAN_IN', 'REPLEDGE_PRINCIPAL_OUT', 'REPLEDGE_INTEREST_OUT', 'REPLEDGE_FEE_OUT', 'LOSS_SETTLEMENT') NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CashCategoryMap_refType_direction_eventType_key`(`refType`, `direction`, `eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashTxn` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `txnNo` VARCHAR(24) NOT NULL,
    `businessDate` DATE NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `mode` ENUM('CASH', 'UPI', 'CARD', 'BANK', 'CREDIT') NOT NULL,
    `fundAccountId` VARCHAR(191) NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `labelId` VARCHAR(191) NULL,
    `labelText` VARCHAR(120) NOT NULL,
    `partyType` VARCHAR(10) NULL,
    `partyId` VARCHAR(191) NULL,
    `partyName` VARCHAR(120) NULL,
    `utr` VARCHAR(40) NULL,
    `notes` VARCHAR(500) NULL,
    `attachmentFileIds` JSON NULL,
    `transferGroupId` VARCHAR(40) NULL,
    `source` ENUM('MANUAL', 'QUICK_CHIP', 'TEMPLATE', 'IMPORT') NOT NULL DEFAULT 'MANUAL',
    `recurringTemplateId` VARCHAR(191) NULL,
    `suggestionMeta` JSON NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'POSTED',
    `cancelledAt` DATETIME(3) NULL,
    `cancelledById` VARCHAR(191) NULL,
    `cancelReasonCode` VARCHAR(30) NULL,
    `cancelReason` VARCHAR(255) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CashTxn_txnNo_key`(`txnNo`),
    UNIQUE INDEX `CashTxn_idempotencyKey_key`(`idempotencyKey`),
    INDEX `CashTxn_businessDate_mode_idx`(`businessDate`, `mode`),
    INDEX `CashTxn_categoryId_businessDate_idx`(`categoryId`, `businessDate`),
    INDEX `CashTxn_labelId_idx`(`labelId`),
    INDEX `CashTxn_partyType_partyId_idx`(`partyType`, `partyId`),
    INDEX `CashTxn_utr_idx`(`utr`),
    INDEX `CashTxn_transferGroupId_idx`(`transferGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TxnLabel` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `key` VARCHAR(120) NOT NULL,
    `displayName` VARCHAR(120) NOT NULL,
    `displayNameHi` VARCHAR(120) NULL,
    `defaultDirection` ENUM('IN', 'OUT') NULL,
    `defaultCategoryId` VARCHAR(191) NULL,
    `defaultMode` ENUM('CASH', 'UPI', 'CARD', 'BANK', 'CREDIT') NULL,
    `defaultAccountId` VARCHAR(191) NULL,
    `defaultPartyType` VARCHAR(10) NULL,
    `defaultPartyId` VARCHAR(191) NULL,
    `useCount` INTEGER NOT NULL DEFAULT 0,
    `firstUsedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `typicalAmountPaise` BIGINT NULL,
    `amountP25Paise` BIGINT NULL,
    `amountP75Paise` BIGINT NULL,
    `recentAmounts` JSON NULL,
    `categoryDist` JSON NULL,
    `modeDist` JSON NULL,
    `weekdayDist` JSON NULL,
    `hourDist` JSON NULL,
    `cadenceDays` INTEGER NULL,
    `cadenceConfidenceBp` INTEGER NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `mergedIntoId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TxnLabel_lastUsedAt_idx`(`lastUsedAt`),
    INDEX `TxnLabel_useCount_idx`(`useCount`),
    UNIQUE INDEX `TxnLabel_shopId_key_key`(`shopId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TxnLabelAlias` (
    `id` VARCHAR(191) NOT NULL,
    `labelId` VARCHAR(191) NOT NULL,
    `aliasKey` VARCHAR(120) NOT NULL,
    `aliasText` VARCHAR(120) NOT NULL,
    `source` VARCHAR(10) NOT NULL,

    INDEX `TxnLabelAlias_labelId_idx`(`labelId`),
    UNIQUE INDEX `TxnLabelAlias_aliasKey_key`(`aliasKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyCashSnapshot` (
    `date` DATE NOT NULL,
    `fundAccountId` VARCHAR(191) NOT NULL,
    `openingPaise` BIGINT NOT NULL,
    `inPaise` BIGINT NOT NULL,
    `outPaise` BIGINT NOT NULL,
    `closingPaise` BIGINT NOT NULL,
    `cashInPaise` BIGINT NOT NULL DEFAULT 0,
    `cashOutPaise` BIGINT NOT NULL DEFAULT 0,
    `upiInPaise` BIGINT NOT NULL DEFAULT 0,
    `upiOutPaise` BIGINT NOT NULL DEFAULT 0,
    `bankInPaise` BIGINT NOT NULL DEFAULT 0,
    `bankOutPaise` BIGINT NOT NULL DEFAULT 0,
    `transferInPaise` BIGINT NOT NULL DEFAULT 0,
    `transferOutPaise` BIGINT NOT NULL DEFAULT 0,
    `entries` INTEGER NOT NULL DEFAULT 0,
    `dayCloseStatus` VARCHAR(10) NULL,
    `computedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`date`, `fundAccountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `businessDate` DATE NOT NULL,
    `refType` ENUM('SALE', 'CREDIT', 'GIRVI', 'OLD_GOLD', 'EXPENSE', 'CASHBOOK', 'TRANSFER', 'OPENING', 'REPLEDGE') NOT NULL,
    `refId` VARCHAR(40) NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `mode` ENUM('CASH', 'UPI', 'CARD', 'BANK', 'CREDIT') NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `fundAccountId` VARCHAR(191) NULL,
    `flowKind` ENUM('SALE_RECEIPT', 'CREDIT_COLLECTION', 'GIRVI_LOAN_OUT', 'GIRVI_INTEREST_IN', 'GIRVI_PRINCIPAL_IN', 'OLD_GOLD_PAYOUT', 'ORDER_ADVANCE', 'REPAIR_RECEIPT', 'SCHEME_INSTALMENT', 'VENDOR_PAYMENT', 'KARIGAR_LABOUR', 'EXPENSE', 'OTHER_INCOME', 'TRANSFER', 'OWNER_CAPITAL', 'OWNER_DRAWING', 'LOAN_TAKEN', 'LOAN_REPAID', 'CASH_ADJUSTMENT', 'OPENING_BALANCE', 'REFUND', 'REPLEDGE_LOAN_IN', 'REPLEDGE_PRINCIPAL_OUT', 'REPLEDGE_INTEREST_OUT', 'REPLEDGE_FEE_OUT', 'LOSS_SETTLEMENT') NULL,
    `categoryId` VARCHAR(191) NULL,
    `cashTxnId` VARCHAR(191) NULL,
    `utr` VARCHAR(40) NULL,
    `utrChecked` BOOLEAN NOT NULL DEFAULT false,
    `utrCheckedAt` DATETIME(3) NULL,
    `utrCheckedById` VARCHAR(191) NULL,
    `reversedOfId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_fundAccountId_businessDate_idx`(`fundAccountId`, `businessDate`),
    INDEX `Payment_flowKind_businessDate_idx`(`flowKind`, `businessDate`),
    INDEX `Payment_utr_idx`(`utr`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StorageLocation` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `name` VARCHAR(80) NOT NULL,
    `type` ENUM('SHOP_DRAWER', 'VAULT', 'HOME', 'TRANSIT', 'VENDOR', 'STAFF', 'OTHER') NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `address` VARCHAR(255) NULL,
    `requiresPinIn` BOOLEAN NOT NULL DEFAULT false,
    `requiresPinOut` BOOLEAN NOT NULL DEFAULT false,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StorageLocation_type_active_idx`(`type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustodyMovement` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `girviId` VARCHAR(191) NOT NULL,
    `itemIds` JSON NOT NULL,
    `fromLocationId` VARCHAR(191) NULL,
    `toLocationId` VARCHAR(191) NOT NULL,
    `movedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `businessDate` DATE NOT NULL,
    `reasonCode` VARCHAR(24) NOT NULL,
    `refType` VARCHAR(20) NULL,
    `refId` VARCHAR(40) NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `photoFileIds` JSON NULL,
    `note` VARCHAR(255) NULL,
    `reversedOfId` VARCHAR(191) NULL,

    INDEX `CustodyMovement_girviId_movedAt_idx`(`girviId`, `movedAt`),
    INDEX `CustodyMovement_toLocationId_movedAt_idx`(`toLocationId`, `movedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationAudit` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `expectedCount` INTEGER NOT NULL DEFAULT 0,
    `foundCount` INTEGER NOT NULL DEFAULT 0,
    `missingCount` INTEGER NOT NULL DEFAULT 0,
    `extraCount` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `note` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationAuditLine` (
    `id` VARCHAR(191) NOT NULL,
    `auditId` VARCHAR(191) NOT NULL,
    `girviId` VARCHAR(191) NOT NULL,
    `expected` BOOLEAN NOT NULL,
    `found` BOOLEAN NOT NULL,
    `note` VARCHAR(255) NULL,

    INDEX `LocationAuditLine_auditId_idx`(`auditId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepledgeLoan` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `loanNo` VARCHAR(24) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `termsId` VARCHAR(191) NULL,
    `vendorRefNo` VARCHAR(40) NULL,
    `vendorReceiptFileId` VARCHAR(191) NULL,
    `date` DATE NULL,
    `principalPaise` BIGINT NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL,
    `offeredTotalPaise` BIGINT NULL,
    `receivedPaise` BIGINT NULL,
    `deductionPaise` BIGINT NOT NULL DEFAULT 0,
    `interestType` ENUM('NONE', 'SIMPLE', 'COMPOUND') NOT NULL,
    `rateBp` INTEGER NOT NULL,
    `ratePeriod` ENUM('MONTH', 'YEAR') NOT NULL,
    `compounding` ENUM('MONTHLY', 'HALF_YEARLY', 'YEARLY') NULL,
    `partialRule` ENUM('PRORATA_DAYS', 'FULL_MONTH', 'HALF_AFTER_15') NOT NULL DEFAULT 'PRORATA_DAYS',
    `minMonths` INTEGER NOT NULL DEFAULT 1,
    `allocation` ENUM('INTEREST_FIRST', 'PRINCIPAL_FIRST') NOT NULL DEFAULT 'INTEREST_FIRST',
    `processingFeePaise` BIGINT NOT NULL DEFAULT 0,
    `dueDate` DATE NULL,
    `packetSealNo` VARCHAR(30) NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'PARTIAL', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `renewedFromId` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RepledgeLoan_loanNo_key`(`loanNo`),
    INDEX `RepledgeLoan_vendorId_status_idx`(`vendorId`, `status`),
    INDEX `RepledgeLoan_dueDate_status_idx`(`dueDate`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepledgeLink` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `girviId` VARCHAR(191) NOT NULL,
    `itemIds` JSON NOT NULL,
    `weightNetMg` INTEGER NOT NULL,
    `weightFineMg` INTEGER NOT NULL,
    `valuePaise` BIGINT NOT NULL,
    `offeredPaise` BIGINT NOT NULL,
    `allocatedPrincipalPaise` BIGINT NOT NULL,
    `allocationBasis` VARCHAR(8) NOT NULL,
    `vendorGirviRef` VARCHAR(40) NULL,
    `sentOn` DATE NULL,
    `returnedOn` DATE NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PLANNED',
    `recallStatus` ENUM('REQUESTED', 'REPAYING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED') NULL,
    `recallRequestedAt` DATETIME(3) NULL,
    `recallReceivedAt` DATETIME(3) NULL,

    INDEX `RepledgeLink_girviId_status_idx`(`girviId`, `status`),
    UNIQUE INDEX `RepledgeLink_loanId_girviId_key`(`loanId`, `girviId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepledgeEvent` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `type` ENUM('OPEN', 'TOPUP', 'INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'PART_RELEASE', 'RENEWAL', 'FEE', 'CLOSE', 'ADJUSTMENT', 'SETTLEMENT', 'SUBSTITUTION', 'REVERSAL') NOT NULL,
    `amountPaise` BIGINT NOT NULL DEFAULT 0,
    `date` DATE NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `linkIds` JSON NULL,
    `note` VARCHAR(255) NULL,
    `reversedOfId` VARCHAR(191) NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RepledgeEvent_loanId_date_idx`(`loanId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepledgeSettlement` (
    `id` VARCHAR(191) NOT NULL,
    `voucherNo` VARCHAR(24) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `settledOn` DATE NOT NULL,
    `sequence` VARCHAR(16) NOT NULL,
    `systemPayablePaise` BIGINT NOT NULL,
    `vendorAskingPaise` BIGINT NULL,
    `varianceReason` VARCHAR(255) NULL,
    `varianceApprovedById` VARCHAR(191) NULL,
    `paidPaise` BIGINT NOT NULL,
    `mode` ENUM('CASH', 'UPI', 'CARD', 'BANK', 'CREDIT') NOT NULL,
    `fundAccountId` VARCHAR(191) NULL,
    `paymentIds` JSON NULL,
    `collectedByName` VARCHAR(80) NULL,
    `collectedByPhone` VARCHAR(15) NULL,
    `collectedAt` DATETIME(3) NULL,
    `sealNo` VARCHAR(30) NULL,
    `vendorReceiptFileIds` JSON NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RepledgeSettlement_voucherNo_key`(`voucherNo`),
    INDEX `RepledgeSettlement_loanId_settledOn_idx`(`loanId`, `settledOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepledgeSettlementLine` (
    `id` VARCHAR(191) NOT NULL,
    `settlementId` VARCHAR(191) NOT NULL,
    `girviId` VARCHAR(191) NOT NULL,
    `linkId` VARCHAR(191) NOT NULL,
    `principalPaise` BIGINT NOT NULL,
    `interestPaise` BIGINT NOT NULL,
    `chargePaise` BIGINT NOT NULL DEFAULT 0,
    `adjustmentPaise` BIGINT NOT NULL DEFAULT 0,
    `totalPaise` BIGINT NOT NULL,
    `weightCheckOk` BOOLEAN NULL,
    `weightNote` VARCHAR(255) NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedById` VARCHAR(191) NULL,

    INDEX `RepledgeSettlementLine_settlementId_idx`(`settlementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagDef` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `nameEn` VARCHAR(60) NOT NULL,
    `nameHi` VARCHAR(60) NULL,
    `colorHex` VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    `icon` VARCHAR(30) NULL,
    `group` VARCHAR(30) NOT NULL DEFAULT 'CUSTOM',
    `isAuto` BOOLEAN NOT NULL DEFAULT false,
    `effect` VARCHAR(30) NOT NULL DEFAULT 'NONE',
    `permission` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TagDef_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntityTag` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(30) NOT NULL,
    `entityId` VARCHAR(40) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `isAuto` BOOLEAN NOT NULL DEFAULT false,
    `appliedByUserId` VARCHAR(191) NULL,
    `reason` VARCHAR(255) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EntityTag_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `EntityTag_tagId_idx`(`tagId`),
    UNIQUE INDEX `EntityTag_entityType_entityId_tagId_key`(`entityType`, `entityId`, `tagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmartList` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `icon` VARCHAR(30) NULL,
    `entityType` VARCHAR(30) NOT NULL,
    `tagIds` JSON NULL,
    `queryCriteria` JSON NULL,
    `pinnedToDashboard` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuggestionLog` (
    `id` VARCHAR(191) NOT NULL,
    `calculatorType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(40) NULL,
    `inputsJson` JSON NOT NULL,
    `suggestedValuePaise` BIGINT NOT NULL,
    `acceptedValuePaise` BIGINT NOT NULL,
    `varianceReason` VARCHAR(255) NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SuggestionLog_calculatorType_createdAt_idx`(`calculatorType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsSnapshot` (
    `date` DATE NOT NULL,
    `metricId` VARCHAR(60) NOT NULL,
    `dimensionKey` VARCHAR(40) NOT NULL DEFAULT 'GLOBAL',
    `dimensionValue` VARCHAR(80) NOT NULL DEFAULT 'ALL',
    `valuePaise` BIGINT NOT NULL DEFAULT 0,
    `valueNumber` DOUBLE NOT NULL DEFAULT 0,
    `computedAt` DATETIME(3) NOT NULL,

    INDEX `AnalyticsSnapshot_metricId_date_idx`(`metricId`, `date`),
    PRIMARY KEY (`date`, `metricId`, `dimensionKey`, `dimensionValue`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdentityRequirementProfile` (
    `id` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(20) NOT NULL,
    `field` VARCHAR(40) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `amountThresholdPaise` BIGINT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IdentityRequirementProfile_moduleId_field_key`(`moduleId`, `field`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DuplicateDecision` (
    `id` VARCHAR(191) NOT NULL,
    `newCustomerId` VARCHAR(191) NOT NULL,
    `candidateCustomerId` VARCHAR(191) NOT NULL,
    `matchScoreBp` INTEGER NOT NULL,
    `decision` VARCHAR(12) NOT NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DuplicateDecision_newCustomerId_idx`(`newCustomerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseLot` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(40) NOT NULL,
    `vendorInvoiceNo` VARCHAR(40) NULL,
    `basis` ENUM('RUPEE_FIXED', 'RATE_OPEN', 'METAL_ACCOUNT') NOT NULL DEFAULT 'RATE_OPEN',
    `totalFineMg` INTEGER NOT NULL,
    `openFineMg` INTEGER NOT NULL,
    `provisionalRatePaise` BIGINT NOT NULL,
    `provisionalValuePaise` BIGINT NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'RATE_OPEN',
    `dueDate` DATE NULL,
    `rateMode` ENUM('LOCKED_AT_SALE', 'QUEUED_FLOATING') NOT NULL DEFAULT 'LOCKED_AT_SALE',
    `queuedAt` DATETIME(3) NULL,
    `settledAt` DATETIME(3) NULL,
    `settledRatePaisePerGram` BIGINT NULL,
    `settledById` VARCHAR(191) NULL,
    `memoInLineId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseLot_vendorId_status_idx`(`vendorId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateFixEvent` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseLotId` VARCHAR(191) NOT NULL,
    `fineMgFixed` INTEGER NOT NULL,
    `fixedRatePaise` BIGINT NOT NULL,
    `metalValuePaise` BIGINT NOT NULL,
    `gstPaise` BIGINT NOT NULL DEFAULT 0,
    `costRevisionBatchId` VARCHAR(40) NULL,
    `note` TEXT NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RateFixEvent_purchaseLotId_idx`(`purchaseLotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemCostRevision` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(40) NOT NULL,
    `batchId` VARCHAR(40) NOT NULL,
    `sourceEventId` VARCHAR(40) NULL,
    `oldMetalRate` BIGINT NOT NULL,
    `newMetalRate` BIGINT NOT NULL,
    `oldMetalCost` BIGINT NOT NULL,
    `newMetalCost` BIGINT NOT NULL,
    `deltaPaise` BIGINT NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ItemCostRevision_itemId_idx`(`itemId`),
    INDEX `ItemCostRevision_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GirviTranche` (
    `id` VARCHAR(191) NOT NULL,
    `girviId` VARCHAR(40) NOT NULL,
    `seqNo` INTEGER NOT NULL DEFAULT 1,
    `kind` VARCHAR(20) NOT NULL DEFAULT 'ORIGINAL',
    `principalOpenPaise` BIGINT NOT NULL,
    `interestType` VARCHAR(16) NOT NULL DEFAULT 'SIMPLE',
    `ratePerMonthPct` DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
    `compounding` VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
    `startDate` DATE NOT NULL,
    `dueDate` DATE NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'OPEN',
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GirviTranche_girviId_status_idx`(`girviId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartialReleaseBatch` (
    `id` VARCHAR(191) NOT NULL,
    `girviId` VARCHAR(40) NOT NULL,
    `batchNo` VARCHAR(24) NOT NULL,
    `articleIdsJson` JSON NOT NULL,
    `state` VARCHAR(30) NOT NULL DEFAULT 'PAID_AWAITING_RELEASE',
    `minPrincipalToPayPaise` BIGINT NOT NULL DEFAULT 0,
    `collectorName` VARCHAR(120) NULL,
    `collectorRelation` VARCHAR(40) NULL,
    `collectorIdType` VARCHAR(30) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `deliveredById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PartialReleaseBatch_girviId_idx`(`girviId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(40) NOT NULL,
    `girviId` VARCHAR(40) NOT NULL,
    `trancheId` VARCHAR(40) NULL,
    `interestPaise` BIGINT NOT NULL DEFAULT 0,
    `principalPaise` BIGINT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentAllocation_paymentId_idx`(`paymentId`),
    INDEX `PaymentAllocation_girviId_idx`(`girviId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemWeightRevision` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `oldNetMg` INTEGER NOT NULL,
    `newNetMg` INTEGER NOT NULL,
    `reason` VARCHAR(120) NOT NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `rateSnapshotId` VARCHAR(191) NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ItemWeightRevision_inventoryItemId_idx`(`inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoneItem` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `stoneType` VARCHAR(40) NOT NULL,
    `subType` VARCHAR(40) NULL,
    `weightMg` INTEGER NOT NULL,
    `origin` VARCHAR(60) NULL,
    `treatment` VARCHAR(60) NULL,
    `certNo` VARCHAR(40) NULL,
    `certLabId` VARCHAR(191) NULL,
    `colour` VARCHAR(30) NULL,
    `clarity` VARCHAR(20) NULL,
    `shape` VARCHAR(30) NULL,
    `planetAttr` VARCHAR(30) NULL,
    `rashiAttr` VARCHAR(30) NULL,
    `costPaise` BIGINT NULL,
    `listPaise` BIGINT NULL,
    `customerSupplied` BOOLEAN NOT NULL DEFAULT false,

    INDEX `StoneItem_inventoryItemId_idx`(`inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemoIn` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL DEFAULT 'main',
    `wholesalerVendorId` VARCHAR(191) NOT NULL,
    `wholesalerMemoNo` VARCHAR(40) NULL,
    `shopMemoNo` VARCHAR(24) NOT NULL,
    `receivedOn` DATE NOT NULL,
    `returnByDate` DATE NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MemoIn_shopMemoNo_key`(`shopMemoNo`),
    UNIQUE INDEX `MemoIn_idempotencyKey_key`(`idempotencyKey`),
    INDEX `MemoIn_wholesalerVendorId_status_idx`(`wholesalerVendorId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemoInLine` (
    `id` VARCHAR(191) NOT NULL,
    `memoInId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL,
    `statedPurityPpt` INTEGER NOT NULL,
    `testedPurityPpt` INTEGER NULL,
    `testMethod` VARCHAR(16) NULL,
    `grossMg` INTEGER NOT NULL,
    `stoneMg` INTEGER NOT NULL DEFAULT 0,
    `netMg` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `touchPpt` INTEGER NOT NULL,
    `touchSource` VARCHAR(10) NOT NULL,
    `alterPolicy` ENUM('ALTER_NONE', 'ALTER_MINOR', 'ALTER_FREE') NOT NULL DEFAULT 'ALTER_NONE',
    `photoFileIds` JSON NULL,
    `status` ENUM('RECEIVED', 'ON_HOLD', 'COMMITTED', 'SOLD', 'RETURNED', 'LOST') NOT NULL DEFAULT 'RECEIVED',
    `heldForCustomerId` VARCHAR(191) NULL,
    `expectedDecisionOn` DATE NULL,
    `inventoryItemId` VARCHAR(191) NULL,
    `convertedSaleId` VARCHAR(191) NULL,
    `convertedPurchaseInvoiceId` VARCHAR(191) NULL,
    `lossSettlementId` VARCHAR(191) NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MemoInLine_memoInId_status_idx`(`memoInId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TouchSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `wholesalerVendorId` VARCHAR(191) NOT NULL,
    `metal` ENUM('GOLD', 'SILVER') NOT NULL,
    `purityBandLabel` VARCHAR(20) NOT NULL,
    `purityPptMin` INTEGER NOT NULL,
    `purityPptMax` INTEGER NOT NULL,
    `category` VARCHAR(40) NULL,
    `touchPptDefault` INTEGER NOT NULL,
    `touchPptMin` INTEGER NULL,
    `touchPptMax` INTEGER NULL,
    `effectiveFrom` DATE NOT NULL,
    `note` VARCHAR(200) NULL,
    `setById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TouchSchedule_wholesalerVendorId_metal_effectiveFrom_idx`(`wholesalerVendorId`, `metal`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LossSettlement` (
    `id` VARCHAR(191) NOT NULL,
    `memoInLineId` VARCHAR(191) NOT NULL,
    `wholesalerVendorId` VARCHAR(191) NOT NULL,
    `settlementRatePaisePerGram` BIGINT NOT NULL,
    `payablePaise` BIGINT NOT NULL,
    `reasonCode` VARCHAR(20) NOT NULL,
    `note` VARCHAR(255) NULL,
    `insuranceClaimRef` VARCHAR(60) NULL,
    `byUserId` VARCHAR(191) NOT NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LossSettlement_memoInLineId_key`(`memoInLineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthProbe` (
    `id` VARCHAR(191) NOT NULL,
    `note` VARCHAR(200) NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertInstance` ADD CONSTRAINT `AlertInstance_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `AlertRule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GirviLoan` ADD CONSTRAINT `GirviLoan_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GirviItem` ADD CONSTRAINT `GirviItem_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `StorageLocation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GirviItem` ADD CONSTRAINT `GirviItem_girviLoanId_fkey` FOREIGN KEY (`girviLoanId`) REFERENCES `GirviLoan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationAuditLine` ADD CONSTRAINT `LocationAuditLine_auditId_fkey` FOREIGN KEY (`auditId`) REFERENCES `LocationAudit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepledgeLink` ADD CONSTRAINT `RepledgeLink_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `RepledgeLoan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepledgeEvent` ADD CONSTRAINT `RepledgeEvent_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `RepledgeLoan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepledgeSettlementLine` ADD CONSTRAINT `RepledgeSettlementLine_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `RepledgeSettlement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityTag` ADD CONSTRAINT `EntityTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `TagDef`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RateFixEvent` ADD CONSTRAINT `RateFixEvent_purchaseLotId_fkey` FOREIGN KEY (`purchaseLotId`) REFERENCES `PurchaseLot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemoInLine` ADD CONSTRAINT `MemoInLine_memoInId_fkey` FOREIGN KEY (`memoInId`) REFERENCES `MemoIn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

