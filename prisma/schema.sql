-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(150) NOT NULL,
    `company_code` VARCHAR(3) NOT NULL,
    `pan_number` VARCHAR(10) NOT NULL,
    `gstin_number` VARCHAR(15) NULL,
    `tan_number` VARCHAR(10) NULL,
    `udyam_msme` VARCHAR(30) NULL,
    `iec_code` VARCHAR(15) NULL,
    `gst_enabled` BOOLEAN NOT NULL DEFAULT true,
    `gst_registration_date` DATE NULL,
    `business_type` VARCHAR(50) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `logo_path` LONGTEXT NULL,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state_code` VARCHAR(2) NULL,
    `pincode` VARCHAR(10) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'India',
    `distance_km` DECIMAL(8, 2) NULL,
    `mobile` VARCHAR(20) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `website` VARCHAR(255) NULL,
    `bank_account_number` VARCHAR(30) NULL,
    `bank_name` VARCHAR(150) NULL,
    `bank_branch` VARCHAR(150) NULL,
    `bank_ifsc` VARCHAR(11) NULL,
    `bank_swift` VARCHAR(11) NULL,
    `eway_portal_user` VARCHAR(255) NULL,
    `eway_portal_pass` VARCHAR(500) NULL,
    `gstr_portal_user` VARCHAR(255) NULL,
    `gstr_portal_pass` VARCHAR(500) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    UNIQUE INDEX `companies_company_name_key`(`company_name`),
    UNIQUE INDEX `companies_company_code_key`(`company_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_years` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `is_closed` BOOLEAN NOT NULL DEFAULT false,
    `lock_transaction_upto_date` DATE NULL,
    `gst_active` BOOLEAN NOT NULL DEFAULT true,
    `tcs_active` BOOLEAN NOT NULL DEFAULT true,
    `account_effect` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_financial_years_company_active`(`company_id`, `is_active`),
    UNIQUE INDEX `UQ_financial_years_company_dates`(`company_id`, `from_date`, `to_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `state_codes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `state_code` VARCHAR(2) NOT NULL,
    `state_name` VARCHAR(100) NOT NULL,
    `is_ut` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `state_codes_state_code_key`(`state_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hsn_codes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `hsn_code` VARCHAR(8) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `gst_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `cess_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,

    UNIQUE INDEX `hsn_codes_hsn_code_key`(`hsn_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_groups` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `group_name` VARCHAR(150) NOT NULL,
    `parent_group_id` INTEGER UNSIGNED NULL,
    `nature` VARCHAR(30) NOT NULL,
    `is_global` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_account_groups_company_parent`(`company_id`, `parent_group_id`),
    UNIQUE INDEX `UQ_account_groups_company_name`(`company_id`, `group_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `account_group_id` INTEGER UNSIGNED NOT NULL,
    `account_name` VARCHAR(150) NOT NULL,
    `print_name` VARCHAR(150) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_broker` BOOLEAN NOT NULL DEFAULT false,
    `gstin_number` VARCHAR(15) NULL,
    `pan_number` VARCHAR(10) NULL,
    `gst_reg_type` ENUM('REGISTERED', 'COMPOSITION', 'UNREGISTERED', 'SEZ_DEVELOPER', 'SEZ_UNIT') NULL,
    `udyam_msme` VARCHAR(30) NULL,
    `tds_ledger_id` INTEGER UNSIGNED NULL,
    `tds_pct` DECIMAL(5, 2) NULL,
    `tcs_pct` DECIMAL(5, 2) NULL,
    `gst_pct` DECIMAL(5, 2) NULL,
    `broker_id` INTEGER UNSIGNED NULL,
    `credit_days` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `credit_limit` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state_code` VARCHAR(2) NULL,
    `pincode` VARCHAR(10) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'India',
    `mobile` VARCHAR(20) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `bank_account_number` VARCHAR(30) NULL,
    `bank_name` VARCHAR(150) NULL,
    `bank_branch` VARCHAR(150) NULL,
    `bank_ifsc` VARCHAR(11) NULL,
    `opening_balance_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `opening_balance_type` ENUM('DEBIT', 'CREDIT') NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_accounts_company_status`(`company_id`, `status`, `is_deleted`),
    INDEX `IX_accounts_company_group`(`company_id`, `account_group_id`),
    INDEX `IX_accounts_company_broker`(`company_id`, `is_broker`),
    UNIQUE INDEX `UQ_accounts_company_name`(`company_id`, `account_name`),
    FULLTEXT INDEX `FT_accounts_name`(`account_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `broker_profiles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `account_id` INTEGER UNSIGNED NOT NULL,
    `brokerage_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `add_less` ENUM('ADD', 'LESS') NOT NULL DEFAULT 'LESS',
    `tds_ledger_id` INTEGER UNSIGNED NULL,
    `tds_pct` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    UNIQUE INDEX `broker_profiles_account_id_key`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualities` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `quality_name` VARCHAR(100) NOT NULL,
    `hsn_number` VARCHAR(8) NOT NULL,
    `uqc` ENUM('CTS', 'PCS') NOT NULL DEFAULT 'CTS',
    `purchase_rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `sale_rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `mrp` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `min_level` DECIMAL(12, 3) NOT NULL DEFAULT 0.00,
    `max_level` DECIMAL(12, 3) NOT NULL DEFAULT 0.00,
    `opening_balance_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `opening_balance_pcs` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `opening_balance_rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `is_service` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_qualities_company_status`(`company_id`, `status`, `is_deleted`),
    UNIQUE INDEX `UQ_qualities_company_name`(`company_id`, `quality_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_gst_history` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `quality_id` INTEGER UNSIGNED NOT NULL,
    `apply_date` DATE NOT NULL,
    `gst_pct` DECIMAL(5, 2) NOT NULL,
    `cess_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `remarks` VARCHAR(255) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `IX_quality_gst_history_date`(`quality_id`, `apply_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_invoices` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `invoice_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE') NOT NULL DEFAULT 'SALE_INVOICE',
    `voucher_number` VARCHAR(50) NOT NULL,
    `bill_number` VARCHAR(50) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NULL,
    `status` ENUM('DRAFT', 'SAVED', 'APPROVED', 'CANCELLED', 'DELETED') NOT NULL DEFAULT 'DRAFT',
    `payment_status` ENUM('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `customer_gstin` VARCHAR(15) NULL,
    `customer_state_code` VARCHAR(2) NULL,
    `place_of_supply` VARCHAR(2) NULL,
    `broker_id` INTEGER UNSIGNED NULL,
    `brokerage_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `brokerage_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `credit_days` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `total_pieces` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_gross_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_discount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_cgst` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_sgst` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_igst` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_cess` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_tcs` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `tcs_section` VARCHAR(10) NULL,
    `tcs_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `round_off` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `jama_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `outstanding_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `net_amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `reference_invoice_id` INTEGER UNSIGNED NULL,
    `reference_bill_number` VARCHAR(50) NULL,
    `challan_voucher_id` INTEGER UNSIGNED NULL,
    `narration` TEXT NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_sale_invoices_company_date`(`company_id`, `invoice_date`),
    INDEX `IX_sale_invoices_customer`(`company_id`, `customer_id`, `status`),
    INDEX `IX_sale_invoices_payment`(`company_id`, `payment_status`),
    INDEX `IX_sale_invoices_type`(`company_id`, `invoice_type`),
    UNIQUE INDEX `UQ_sale_invoices_bill`(`company_id`, `financial_year_id`, `bill_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_invoice_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `sale_invoice_id` INTEGER UNSIGNED NOT NULL,
    `row_number` INTEGER UNSIGNED NOT NULL,
    `quality_id` INTEGER UNSIGNED NOT NULL,
    `hsn_number` VARCHAR(8) NOT NULL,
    `carats` DECIMAL(12, 3) NOT NULL,
    `pieces` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `rate` DECIMAL(18, 2) NOT NULL,
    `less_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `terms_rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `gross_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `gst_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `cgst_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `sgst_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `igst_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `cess_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `cess_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `rate_alt` DECIMAL(18, 2) NULL,
    `net_amount_alt` DECIMAL(18, 2) NULL,
    `target_sale_rate` DECIMAL(18, 2) NULL,
    `stock_packet_id` INTEGER UNSIGNED NULL,

    INDEX `IX_sale_invoice_items_invoice`(`sale_invoice_id`),
    INDEX `IX_sale_invoice_items_quality`(`quality_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_invoices` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `invoice_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE') NOT NULL DEFAULT 'PURCHASE_INVOICE',
    `voucher_number` VARCHAR(50) NOT NULL,
    `bill_number` VARCHAR(50) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NULL,
    `status` ENUM('DRAFT', 'SAVED', 'APPROVED', 'CANCELLED', 'DELETED') NOT NULL DEFAULT 'DRAFT',
    `payment_status` ENUM('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
    `supplier_id` INTEGER UNSIGNED NOT NULL,
    `supplier_gstin` VARCHAR(15) NULL,
    `supplier_state_code` VARCHAR(2) NULL,
    `place_of_supply` VARCHAR(2) NULL,
    `broker_id` INTEGER UNSIGNED NULL,
    `brokerage_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `brokerage_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `credit_days` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `total_pieces` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_gross_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_discount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_cgst` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_sgst` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_igst` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_cess` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_tds` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `tds_section` VARCHAR(10) NULL,
    `tds_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `round_off` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `jama_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `outstanding_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `net_amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `reference_invoice_id` INTEGER UNSIGNED NULL,
    `reference_bill_number` VARCHAR(50) NULL,
    `narration` TEXT NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_purchase_invoices_company_date`(`company_id`, `invoice_date`),
    INDEX `IX_purchase_invoices_supplier`(`company_id`, `supplier_id`, `status`),
    INDEX `IX_purchase_invoices_payment`(`company_id`, `payment_status`),
    UNIQUE INDEX `UQ_purchase_invoices_bill`(`company_id`, `financial_year_id`, `bill_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_invoice_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `purchase_invoice_id` INTEGER UNSIGNED NOT NULL,
    `row_number` INTEGER UNSIGNED NOT NULL,
    `quality_id` INTEGER UNSIGNED NOT NULL,
    `hsn_number` VARCHAR(8) NOT NULL,
    `carats` DECIMAL(12, 3) NOT NULL,
    `pieces` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `rate` DECIMAL(18, 2) NOT NULL,
    `target_sale_rate` DECIMAL(18, 2) NULL,
    `less_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `terms_rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `gross_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `gst_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `cgst_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `sgst_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `igst_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `cess_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `cess_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `rate_alt` DECIMAL(18, 2) NULL,
    `net_amount_alt` DECIMAL(18, 2) NULL,
    `stock_packet_id` INTEGER UNSIGNED NULL,

    INDEX `IX_purchase_invoice_items_invoice`(`purchase_invoice_id`),
    INDEX `IX_purchase_invoice_items_quality`(`quality_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challan_vouchers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `purpose` ENUM('TRADING_JHANGHAD', 'JOB_WORK', 'INTERNAL_TRANSFER', 'CERTIFICATION', 'SALE_ORDER', 'PURCHASE_ORDER') NOT NULL,
    `voucher_number` VARCHAR(50) NOT NULL,
    `challan_number` VARCHAR(50) NOT NULL,
    `challan_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'DISPATCHED', 'PENDING', 'PARTIAL_RETURN', 'RETURNED', 'CONVERTED', 'CLOSED', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'DRAFT',
    `party_id` INTEGER UNSIGNED NOT NULL,
    `party_name` VARCHAR(150) NULL,
    `expected_return_date` DATE NULL,
    `actual_return_date` DATE NULL,
    `total_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `total_pieces` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `returned_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `returned_pieces` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `total_amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `converted_invoice_type` VARCHAR(30) NULL,
    `converted_invoice_id` INTEGER UNSIGNED NULL,
    `narration` TEXT NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_challan_vouchers_purpose_status`(`company_id`, `purpose`, `status`),
    INDEX `IX_challan_vouchers_return_date`(`company_id`, `expected_return_date`),
    INDEX `IX_challan_vouchers_party`(`company_id`, `party_id`),
    UNIQUE INDEX `UQ_challan_vouchers_number`(`company_id`, `financial_year_id`, `challan_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challan_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `challan_voucher_id` INTEGER UNSIGNED NOT NULL,
    `row_number` INTEGER UNSIGNED NOT NULL,
    `quality_id` INTEGER UNSIGNED NOT NULL,
    `carats` DECIMAL(12, 3) NOT NULL,
    `pieces` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `rate_alt` DECIMAL(18, 2) NULL,
    `amount_alt` DECIMAL(18, 2) NULL,
    `returned_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `returned_pieces` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `stock_packet_id` INTEGER UNSIGNED NULL,
    `remarks` VARCHAR(255) NULL,

    INDEX `IX_challan_items_voucher`(`challan_voucher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_vouchers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `journal_type` ENUM('GENERAL', 'ADJUSTMENT', 'OPENING', 'CLOSING', 'RECTIFICATION', 'GST_ADJUSTMENT', 'TDS_ADJUSTMENT', 'DEPRECIATION', 'SALARY_PROVISION', 'INTEREST_ACCRUAL', 'BROKERAGE_ALLOCATION') NOT NULL DEFAULT 'GENERAL',
    `voucher_number` VARCHAR(50) NOT NULL,
    `voucher_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'CANCELLED', 'REVERSED', 'DELETED') NOT NULL DEFAULT 'DRAFT',
    `total_debit` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_credit` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `narration` TEXT NULL,
    `reference_id` VARCHAR(50) NULL,
    `reference_type` VARCHAR(30) NULL,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_journal_vouchers_date`(`company_id`, `voucher_date`),
    UNIQUE INDEX `UQ_journal_vouchers_number`(`company_id`, `financial_year_id`, `voucher_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_voucher_lines` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `journal_voucher_id` INTEGER UNSIGNED NOT NULL,
    `row_number` INTEGER UNSIGNED NOT NULL,
    `account_id` INTEGER UNSIGNED NOT NULL,
    `debit_credit_type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `amount_alt` DECIMAL(18, 2) NULL,
    `narration` VARCHAR(255) NULL,
    `outstanding_bill_id` INTEGER UNSIGNED NULL,

    INDEX `IX_journal_voucher_lines_voucher`(`journal_voucher_id`),
    INDEX `IX_journal_voucher_lines_account`(`account_id`),
    INDEX `IX_journal_voucher_lines_bill`(`outstanding_bill_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_bank_vouchers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `transaction_type` ENUM('CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT') NOT NULL,
    `voucher_number` VARCHAR(50) NOT NULL,
    `manual_voucher_no` VARCHAR(50) NULL,
    `voucher_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'CANCELLED', 'REVERSED', 'DELETED') NOT NULL DEFAULT 'DRAFT',
    `party_id` INTEGER UNSIGNED NOT NULL,
    `cash_bank_account_id` INTEGER UNSIGNED NOT NULL,
    `payment_mode` ENUM('CASH', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'BANK_TRANSFER', 'DEMAND_DRAFT', 'CASH_DEPOSIT') NULL,
    `cheque_number` VARCHAR(20) NULL,
    `cheque_date` DATE NULL,
    `utr_number` VARCHAR(50) NULL,
    `transaction_ref` VARCHAR(50) NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `narration` TEXT NULL,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `reference_bill_no` VARCHAR(50) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_cash_bank_vouchers_type_date`(`company_id`, `transaction_type`, `voucher_date`),
    INDEX `IX_cash_bank_vouchers_party`(`company_id`, `party_id`),
    UNIQUE INDEX `UQ_cash_bank_vouchers_number`(`company_id`, `financial_year_id`, `voucher_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_bank_allocations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `cash_bank_voucher_id` INTEGER UNSIGNED NOT NULL,
    `outstanding_bill_id` INTEGER UNSIGNED NOT NULL,
    `allocated_amount` DECIMAL(18, 2) NOT NULL,

    INDEX `IX_cash_bank_allocations_voucher`(`cash_bank_voucher_id`),
    INDEX `IX_cash_bank_allocations_bill`(`outstanding_bill_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_vouchers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `job_type` ENUM('JOB_INCOME', 'JOB_EXPENSE') NOT NULL,
    `voucher_number` VARCHAR(50) NOT NULL,
    `bill_number` VARCHAR(50) NOT NULL,
    `voucher_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'POSTED', 'CANCELLED', 'REVERSED', 'DELETED') NOT NULL DEFAULT 'DRAFT',
    `party_id` INTEGER UNSIGNED NOT NULL,
    `subcontractor_party_id` INTEGER UNSIGNED NULL,
    `service_type` VARCHAR(50) NULL,
    `inward_rough_carats` DECIMAL(12, 3) NULL DEFAULT 0.000,
    `inward_piece_count` INTEGER UNSIGNED NULL DEFAULT 1,
    `outward_polished_carats` DECIMAL(12, 3) NULL,
    `outward_piece_count` INTEGER UNSIGNED NULL,
    `client_billed_rate` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `contractor_expense_rate` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `contractor_expense_total` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `gst_rate` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `cgst_amount` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `sgst_amount` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `igst_amount` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `net_amount` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `total_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `total_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_outward_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `total_outward_pieces` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `is_fully_completed` BOOLEAN NOT NULL DEFAULT false,
    `narration` TEXT NULL,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `total_amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_job_vouchers_date`(`company_id`, `voucher_date`),
    UNIQUE INDEX `UQ_job_vouchers_bill`(`company_id`, `financial_year_id`, `bill_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_voucher_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `job_voucher_id` INTEGER UNSIGNED NOT NULL,
    `row_number` INTEGER UNSIGNED NOT NULL,
    `quality_id` INTEGER UNSIGNED NOT NULL,
    `carats` DECIMAL(12, 3) NOT NULL,
    `pieces` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `rate` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `rate_alt` DECIMAL(18, 2) NULL,
    `amount_alt` DECIMAL(18, 2) NULL,
    `stock_packet_id` INTEGER UNSIGNED NULL,
    `remarks` VARCHAR(255) NULL,

    INDEX `IX_job_voucher_items_voucher`(`job_voucher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_cost_entries` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `job_voucher_id` INTEGER UNSIGNED NOT NULL,
    `stock_packet_id` INTEGER UNSIGNED NOT NULL,
    `cost_type` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `remarks` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_job_cost_entries_voucher`(`job_voucher_id`),
    INDEX `IX_job_cost_entries_packet`(`stock_packet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `general_ledger_entries` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `account_id` INTEGER UNSIGNED NOT NULL,
    `voucher_date` DATE NOT NULL,
    `debit_credit_type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `source_voucher_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER', 'JOB_INCOME', 'JOB_EXPENSE', 'MEMO_TRADING', 'MEMO_JOB_WORK', 'MEMO_SALE_ORDER', 'MEMO_PURCHASE_ORDER', 'MEMO_CERTIFICATION', 'MEMO_INTERNAL', 'STOCK_ENTRY', 'STOCK_ADJUSTMENT', 'OPENING', 'LOAN_VOUCHER', 'STOCK_CONVERSION') NOT NULL,
    `source_voucher_id` INTEGER UNSIGNED NOT NULL,
    `source_bill_number` VARCHAR(50) NULL,
    `narration` VARCHAR(255) NULL,
    `original_currency` ENUM('USD', 'INR') NULL,
    `original_amount` DECIMAL(18, 2) NULL,
    `exchange_rate` DECIMAL(12, 4) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_gl_entries_account_date`(`company_id`, `account_id`, `voucher_date`),
    INDEX `IX_gl_entries_company_date`(`company_id`, `voucher_date`),
    INDEX `IX_gl_entries_source`(`source_voucher_type`, `source_voucher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outstanding_bills` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `account_id` INTEGER UNSIGNED NOT NULL,
    `bill_number` VARCHAR(50) NOT NULL,
    `bill_date` DATE NOT NULL,
    `due_date` DATE NULL,
    `bill_type` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `original_amount` DECIMAL(18, 2) NOT NULL,
    `allocated_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `outstanding_amount` DECIMAL(18, 2) NOT NULL,
    `status` ENUM('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
    `source_voucher_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER', 'JOB_INCOME', 'JOB_EXPENSE', 'MEMO_TRADING', 'MEMO_JOB_WORK', 'MEMO_SALE_ORDER', 'MEMO_PURCHASE_ORDER', 'MEMO_CERTIFICATION', 'MEMO_INTERNAL', 'STOCK_ENTRY', 'STOCK_ADJUSTMENT', 'OPENING', 'LOAN_VOUCHER', 'STOCK_CONVERSION') NOT NULL,
    `source_voucher_id` INTEGER UNSIGNED NOT NULL,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `original_amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `IX_outstanding_bills_account`(`company_id`, `account_id`, `status`),
    INDEX `IX_outstanding_bills_due_date`(`company_id`, `due_date`),
    INDEX `IX_outstanding_bills_source`(`source_voucher_type`, `source_voucher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_reconciliations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `cash_bank_voucher_id` INTEGER UNSIGNED NOT NULL,
    `match_status` ENUM('MATCHED', 'AUTO_MATCHED', 'POSSIBLE_MATCH', 'UNMATCHED') NOT NULL DEFAULT 'UNMATCHED',
    `bank_statement_date` DATE NULL,
    `bank_statement_ref` VARCHAR(50) NULL,
    `bank_statement_amount` DECIMAL(18, 2) NULL,
    `reconciled_date` DATE NULL,
    `reconciled_by` INTEGER UNSIGNED NULL,
    `remarks` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `IX_bank_reconciliations_voucher`(`cash_bank_voucher_id`),
    INDEX `IX_bank_reconciliations_status`(`match_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_packets` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `quality_id` INTEGER UNSIGNED NOT NULL,
    `stock_id_number` VARCHAR(30) NOT NULL,
    `category` ENUM('CERTIFIED', 'NON_CERTIFIED') NOT NULL DEFAULT 'NON_CERTIFIED',
    `registration_date` DATE NOT NULL,
    `shape` VARCHAR(255) NULL,
    `carat_weight` DECIMAL(12, 3) NOT NULL,
    `piece_count` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `color` VARCHAR(255) NULL,
    `clarity` VARCHAR(255) NULL,
    `cut` VARCHAR(255) NULL,
    `polish` VARCHAR(255) NULL,
    `symmetry` VARCHAR(255) NULL,
    `length_mm` DECIMAL(8, 2) NULL,
    `width_mm` DECIMAL(8, 2) NULL,
    `depth_mm` DECIMAL(8, 2) NULL,
    `measurements` VARCHAR(255) NULL,
    `total_depth_pct` DECIMAL(5, 2) NULL,
    `table_pct` DECIMAL(5, 2) NULL,
    `girdle_pct` DECIMAL(5, 2) NULL,
    `fluorescence_intensity` VARCHAR(255) NULL,
    `fluorescence_color` VARCHAR(255) NULL,
    `rap_price_per_carat` DECIMAL(18, 2) NULL,
    `rap_discount_pct` DECIMAL(8, 2) NULL,
    `crown_angle` DECIMAL(5, 2) NULL,
    `crown_height` DECIMAL(5, 2) NULL,
    `pavilion_angle` DECIMAL(5, 2) NULL,
    `pavilion_depth` DECIMAL(5, 2) NULL,
    `girdle_min` VARCHAR(255) NULL,
    `girdle_max` VARCHAR(255) NULL,
    `girdle_condition` VARCHAR(255) NULL,
    `culet_size` VARCHAR(255) NULL,
    `culet_condition` VARCHAR(255) NULL,
    `hearts_and_arrows` VARCHAR(255) NULL,
    `eye_clean` VARCHAR(255) NULL,
    `shade` VARCHAR(255) NULL,
    `milky` VARCHAR(255) NULL,
    `treatment` VARCHAR(255) NULL,
    `tinge` VARCHAR(255) NULL,
    `lustre` VARCHAR(255) NULL,
    `table_inclusion` VARCHAR(255) NULL,
    `side_inclusion` VARCHAR(255) NULL,
    `table_open` VARCHAR(255) NULL,
    `crown_open` VARCHAR(255) NULL,
    `girdle_open` VARCHAR(255) NULL,
    `origin` VARCHAR(255) NULL,
    `certificate_url` VARCHAR(255) NULL,
    `web_url` VARCHAR(255) NULL,
    `inscription` VARCHAR(255) NULL,
    `key_to_symbols` VARCHAR(255) NULL,
    `diamond_comment` VARCHAR(255) NULL,
    `fancy_color` VARCHAR(255) NULL,
    `fancy_color_intensity` VARCHAR(255) NULL,
    `fancy_color_overtone` VARCHAR(255) NULL,
    `availability` VARCHAR(255) NULL,
    `city` VARCHAR(255) NULL,
    `state` VARCHAR(255) NULL,
    `trade_show` VARCHAR(255) NULL,
    `brand` VARCHAR(255) NULL,
    `seller_spec` VARCHAR(255) NULL,
    `pair_stock_number` VARCHAR(255) NULL,
    `is_pair_separable` VARCHAR(255) NULL,
    `parcel_stones` VARCHAR(255) NULL,
    `report_filename` VARCHAR(255) NULL,
    `report_issue_date` VARCHAR(255) NULL,
    `lab_location` VARCHAR(255) NULL,
    `cert_comment` VARCHAR(500) NULL,
    `member_comment` VARCHAR(500) NULL,
    `allow_raplink_feed` VARCHAR(255) NULL,
    `sarine_loupe` VARCHAR(255) NULL,
    `report_type` VARCHAR(255) NULL,
    `diamond_type` VARCHAR(255) NULL,
    `black_inclusion` VARCHAR(255) NULL,
    `white_inclusion` VARCHAR(255) NULL,
    `open_inclusion` VARCHAR(255) NULL,
    `star_length` DECIMAL(5, 2) NULL,
    `growth_type` VARCHAR(255) NULL,
    `bgm` VARCHAR(255) NULL,
    `certificate_type` VARCHAR(255) NULL,
    `certificate_number` VARCHAR(191) NULL,
    `cost_per_carat` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `target_sale_rate` DECIMAL(18, 2) NULL,
    `target_sale_rate_currency` ENUM('USD', 'INR') NULL,
    `cost_per_carat_inr` DECIMAL(18, 2) NULL,
    `total_cost_inr` DECIMAL(18, 2) NULL,
    `current_status` ENUM('CREATED', 'PURCHASED', 'AVAILABLE', 'HOLD', 'JOB_WORK', 'SOLD', 'RETURNED', 'DAMAGED', 'ARCHIVED', 'PROCESSED') NOT NULL DEFAULT 'CREATED',
    `current_ownership` ENUM('COMPANY', 'SUPPLIER_MEMO', 'CUSTOMER_MEMO') NOT NULL DEFAULT 'COMPANY',
    `current_owner_id` INTEGER UNSIGNED NULL,
    `current_location` VARCHAR(100) NULL,
    `source_packet_id` INTEGER UNSIGNED NULL,
    `source_transform_id` INTEGER UNSIGNED NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `IX_stock_packets_status`(`company_id`, `current_status`),
    INDEX `IX_stock_packets_physical`(`company_id`, `shape`(50), `color`(50), `clarity`(30)),
    INDEX `IX_stock_packets_weight`(`company_id`, `carat_weight`),
    INDEX `IX_stock_packets_quality`(`company_id`, `quality_id`),
    INDEX `IX_stock_packets_source`(`source_packet_id`),
    UNIQUE INDEX `UQ_stock_packets_id_number`(`company_id`, `stock_id_number`),
    UNIQUE INDEX `UQ_stock_packets_company_cert_number`(`company_id`, `certificate_number`),
    FULLTEXT INDEX `FT_stock_packets_id`(`stock_id_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `stock_packet_id` INTEGER UNSIGNED NOT NULL,
    `movement_date` DATE NOT NULL,
    `movement_type` ENUM('STOCK_CREATION', 'PURCHASE', 'PURCHASE_RETURN', 'SALES', 'SALES_RETURN', 'JOB_WORK_ISSUE', 'JOB_WORK_RECEIVE', 'TRADING_MEMO', 'MANUAL_ADJUSTMENT', 'CORRECTION', 'ARCHIVE', 'QUALITY_TRANSFORMATION') NOT NULL,
    `previous_status` ENUM('CREATED', 'PURCHASED', 'AVAILABLE', 'HOLD', 'JOB_WORK', 'SOLD', 'RETURNED', 'DAMAGED', 'ARCHIVED', 'PROCESSED') NOT NULL,
    `new_status` ENUM('CREATED', 'PURCHASED', 'AVAILABLE', 'HOLD', 'JOB_WORK', 'SOLD', 'RETURNED', 'DAMAGED', 'ARCHIVED', 'PROCESSED') NOT NULL,
    `previous_owner_id` INTEGER UNSIGNED NULL,
    `new_owner_id` INTEGER UNSIGNED NULL,
    `carats` DECIMAL(12, 3) NULL,
    `pieces` INTEGER UNSIGNED NULL,
    `source_voucher_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER', 'JOB_INCOME', 'JOB_EXPENSE', 'MEMO_TRADING', 'MEMO_JOB_WORK', 'MEMO_SALE_ORDER', 'MEMO_PURCHASE_ORDER', 'MEMO_CERTIFICATION', 'MEMO_INTERNAL', 'STOCK_ENTRY', 'STOCK_ADJUSTMENT', 'OPENING', 'LOAN_VOUCHER', 'STOCK_CONVERSION') NULL,
    `source_voucher_id` INTEGER UNSIGNED NULL,
    `remarks` VARCHAR(255) NULL,
    `user_id` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_stock_movements_packet_date`(`stock_packet_id`, `created_at`),
    INDEX `IX_stock_movements_source`(`source_voucher_type`, `source_voucher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_reservations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `stock_packet_id` INTEGER UNSIGNED NOT NULL,
    `challan_voucher_id` INTEGER UNSIGNED NULL,
    `reservation_type` VARCHAR(30) NOT NULL,
    `reserved_carats` DECIMAL(12, 3) NOT NULL,
    `reserved_date` DATE NOT NULL,
    `expiry_date` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `remarks` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_stock_reservations_active`(`stock_packet_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_media` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `stock_packet_id` INTEGER UNSIGNED NOT NULL,
    `media_type` VARCHAR(20) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size_bytes` INTEGER UNSIGNED NULL,
    `sort_order` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_stock_media_packet`(`stock_packet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_audit_batches` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `batch_number` VARCHAR(30) NOT NULL,
    `audit_date` DATE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `total_packets` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `matched_packets` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `mismatch_packets` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `remarks` TEXT NULL,
    `conducted_by` INTEGER UNSIGNED NULL,
    `approved_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher_number_configs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `voucher_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER', 'JOB_INCOME', 'JOB_EXPENSE', 'MEMO_TRADING', 'MEMO_JOB_WORK', 'MEMO_SALE_ORDER', 'MEMO_PURCHASE_ORDER', 'MEMO_CERTIFICATION', 'MEMO_INTERNAL', 'STOCK_ENTRY', 'STOCK_ADJUSTMENT', 'OPENING', 'LOAN_VOUCHER', 'STOCK_CONVERSION') NOT NULL,
    `method` ENUM('AUTOMATIC', 'MANUAL', 'OVERRIDE') NOT NULL DEFAULT 'AUTOMATIC',
    `prefix` VARCHAR(20) NULL,
    `separator` VARCHAR(5) NOT NULL DEFAULT '-',
    `suffix` VARCHAR(20) NULL,
    `digit_length` INTEGER UNSIGNED NOT NULL DEFAULT 6,
    `include_year` BOOLEAN NOT NULL DEFAULT true,
    `include_month` BOOLEAN NOT NULL DEFAULT false,
    `reset_annually` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UQ_voucher_number_configs`(`company_id`, `financial_year_id`, `voucher_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher_number_sequences` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `voucher_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER', 'JOB_INCOME', 'JOB_EXPENSE', 'MEMO_TRADING', 'MEMO_JOB_WORK', 'MEMO_SALE_ORDER', 'MEMO_PURCHASE_ORDER', 'MEMO_CERTIFICATION', 'MEMO_INTERNAL', 'STOCK_ENTRY', 'STOCK_ADJUSTMENT', 'OPENING', 'LOAN_VOUCHER', 'STOCK_CONVERSION') NOT NULL,
    `current_number` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `last_generated_at` DATETIME(3) NULL,

    UNIQUE INDEX `UQ_voucher_number_sequences`(`company_id`, `financial_year_id`, `voucher_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` JSON NULL,
    `category` VARCHAR(50) NULL,
    `description` VARCHAR(255) NULL,
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UQ_system_settings_key`(`company_id`, `setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `print_templates` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `voucher_type` ENUM('SALE_INVOICE', 'SALE_RETURN', 'SALE_DEBIT_NOTE', 'PURCHASE_INVOICE', 'PURCHASE_RETURN', 'PURCHASE_DEBIT_NOTE', 'CASH_PAYMENT', 'CASH_RECEIPT', 'BANK_PAYMENT', 'BANK_RECEIPT', 'JOURNAL_VOUCHER', 'JOB_INCOME', 'JOB_EXPENSE', 'MEMO_TRADING', 'MEMO_JOB_WORK', 'MEMO_SALE_ORDER', 'MEMO_PURCHASE_ORDER', 'MEMO_CERTIFICATION', 'MEMO_INTERNAL', 'STOCK_ENTRY', 'STOCK_ADJUSTMENT', 'OPENING', 'LOAN_VOUCHER', 'STOCK_CONVERSION') NOT NULL,
    `template_name` VARCHAR(100) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `layout_config` JSON NULL,
    `header_html` TEXT NULL,
    `footer_html` TEXT NULL,
    `paper_size` VARCHAR(10) NOT NULL DEFAULT 'A4',
    `orientation` VARCHAR(10) NOT NULL DEFAULT 'portrait',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `IX_print_templates_company_type`(`company_id`, `voucher_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_records` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `backup_type` VARCHAR(20) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size_bytes` BIGINT NULL,
    `checksum` VARCHAR(64) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    `duration_ms` INTEGER UNSIGNED NULL,
    `initiated_by` INTEGER UNSIGNED NULL,
    `remarks` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_backup_records_date`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id_handle` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(20) NULL,
    `designation` VARCHAR(100) NULL,
    `profile_picture_path` VARCHAR(500) NULL,
    `is_super_admin` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE', 'LOCKED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `permission_template_id` INTEGER UNSIGNED NULL,
    `failed_login_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `last_login_at` DATETIME(3) NULL,
    `last_password_change` DATETIME(3) NULL,
    `employee_code` VARCHAR(50) NULL,
    `department` VARCHAR(100) NULL,
    `remarks` VARCHAR(255) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    UNIQUE INDEX `users_user_id_handle_key`(`user_id_handle`),
    UNIQUE INDEX `users_email_key`(`email`(250)),
    UNIQUE INDEX `users_employee_code_key`(`employee_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_company_access` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `granted_by` INTEGER UNSIGNED NULL,

    UNIQUE INDEX `UQ_user_company_access`(`user_id`, `company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `session_token` VARCHAR(255) NOT NULL,
    `hostname` VARCHAR(100) NULL,
    `ip_address` VARCHAR(45) NULL,
    `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity_at` DATETIME(3) NULL,
    `logout_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `user_sessions_session_token_key`(`session_token`(250)),
    INDEX `IX_user_sessions_active`(`user_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_templates` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `company_id` INTEGER UNSIGNED NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_permissions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NULL,
    `permission_template_id` INTEGER UNSIGNED NULL,
    `page_uri` VARCHAR(100) NOT NULL,
    `can_view` BOOLEAN NOT NULL DEFAULT false,

    INDEX `IX_page_permissions_user`(`user_id`),
    INDEX `IX_page_permissions_template`(`permission_template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `module_permissions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NULL,
    `permission_template_id` INTEGER UNSIGNED NULL,
    `module_code` VARCHAR(50) NOT NULL,
    `action_code` VARCHAR(50) NOT NULL,
    `is_allowed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `IX_module_permissions_user`(`user_id`),
    INDEX `IX_module_permissions_template`(`permission_template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NULL,
    `action` VARCHAR(50) NOT NULL,
    `module_code` VARCHAR(50) NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` INTEGER UNSIGNED NULL,
    `description` VARCHAR(500) NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_activity_logs_user_date`(`user_id`, `created_at`),
    INDEX `IX_activity_logs_entity`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_history` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `action` VARCHAR(10) NOT NULL,
    `hostname` VARCHAR(100) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `fail_reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_login_history_user_date`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INTEGER UNSIGNED NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'REVERSE', 'APPROVE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'OVERRIDE') NOT NULL,
    `before_value` JSON NULL,
    `after_value` JSON NULL,
    `changed_fields` JSON NULL,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `hostname` VARCHAR(100) NULL,
    `override_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_audit_logs_entity`(`entity_type`, `entity_id`),
    INDEX `IX_audit_logs_company_date`(`company_id`, `created_at`),
    INDEX `IX_audit_logs_user_date`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_validation_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `validation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `check_type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `details_json` LONGTEXT NOT NULL,
    `certified_by` VARCHAR(50) NOT NULL,
    `certificate_no` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `report_validation_logs_certificate_no_key`(`certificate_no`),
    INDEX `IX_report_validation_company_date`(`company_id`, `validation_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_records` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `notification_type` ENUM('SYSTEM', 'ALERT', 'REMINDER', 'DUE_DATE', 'STOCK_LEVEL', 'APPROVAL', 'WARNING') NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `is_dismissed` BOOLEAN NOT NULL DEFAULT false,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_notifications_user_unread`(`user_id`, `is_read`, `created_at`),
    INDEX `IX_notifications_company_date`(`company_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `error_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `error_code` VARCHAR(30) NULL,
    `error_message` TEXT NOT NULL,
    `stack_trace` TEXT NULL,
    `module_code` VARCHAR(50) NULL,
    `user_id` INTEGER UNSIGNED NULL,
    `hostname` VARCHAR(100) NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'ERROR',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_error_logs_severity_date`(`severity`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_widgets` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `widget_type` ENUM('KPI_CARD', 'CHART_BAR', 'CHART_LINE', 'CHART_PIE', 'CHART_DONUT', 'TABLE', 'LIST', 'CALENDAR', 'PROGRESS') NOT NULL,
    `widget_title` VARCHAR(100) NOT NULL,
    `data_source` VARCHAR(100) NOT NULL,
    `position` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `column_span` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `is_visible` BOOLEAN NOT NULL DEFAULT true,
    `config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `IX_dashboard_widgets_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_workspaces` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `favorite_pages` JSON NULL,
    `quick_actions` JSON NULL,
    `recent_items` JSON NULL,
    `pinned_reports` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_workspaces_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `financial_year_id` INTEGER UNSIGNED NOT NULL,
    `voucher_number` VARCHAR(50) NOT NULL,
    `loan_type` ENUM('GIVEN', 'TAKEN') NOT NULL,
    `party_id` INTEGER UNSIGNED NOT NULL,
    `cash_bank_account_id` INTEGER UNSIGNED NOT NULL,
    `principal_amount` DECIMAL(18, 2) NOT NULL,
    `interest_rate` DECIMAL(5, 2) NOT NULL,
    `interest_type` ENUM('SIMPLE', 'COMPOUND') NOT NULL,
    `compounding_frequency` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
    `duration_months` INTEGER NOT NULL,
    `loan_date` DATE NOT NULL,
    `due_date` DATE NULL,
    `status` ENUM('ACTIVE', 'PARTIAL', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `narration` TEXT NULL,
    `total_interest` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_repayable` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `amount_repaid` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `balance_remaining` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `transaction_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `principal_amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` INTEGER UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER UNSIGNED NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `IX_loans_date`(`company_id`, `loan_date`),
    UNIQUE INDEX `UQ_loans_number`(`company_id`, `financial_year_id`, `voucher_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_repayments` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `loan_id` INTEGER UNSIGNED NOT NULL,
    `payment_date` DATE NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    `amount_alt` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `cash_bank_account_id` INTEGER UNSIGNED NOT NULL,
    `narration` VARCHAR(255) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_notifications` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NULL,
    `user_id` INTEGER UNSIGNED NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    `target_path` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `is_resolved` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_app_notifications_company_read`(`company_id`, `is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_conversions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `conversion_date` DATE NOT NULL,
    `conversion_number` VARCHAR(50) NOT NULL,
    `source_packet_id` INTEGER UNSIGNED NOT NULL,
    `source_quality_id` INTEGER UNSIGNED NOT NULL,
    `source_carats` DECIMAL(12, 3) NOT NULL,
    `source_cost` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `is_full_consumption` BOOLEAN NOT NULL DEFAULT true,
    `consumed_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `remaining_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `job_voucher_id` INTEGER UNSIGNED NULL,
    `challan_voucher_id` INTEGER UNSIGNED NULL,
    `processing_cost` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_output_carats` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `weight_loss` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `loss_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `narration` TEXT NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `IX_stock_conversions_date`(`company_id`, `conversion_date`),
    INDEX `IX_stock_conversions_source`(`source_packet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_conversion_outputs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `stock_conversion_id` INTEGER UNSIGNED NOT NULL,
    `row_number` INTEGER UNSIGNED NOT NULL,
    `output_packet_id` INTEGER UNSIGNED NOT NULL,
    `output_quality_id` INTEGER UNSIGNED NOT NULL,
    `carats` DECIMAL(12, 3) NOT NULL,
    `pieces` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `shape` VARCHAR(30) NULL,
    `color` VARCHAR(30) NULL,
    `clarity` VARCHAR(30) NULL,
    `cut` VARCHAR(30) NULL,
    `cost_per_carat` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `target_sale_rate` DECIMAL(18, 2) NULL,
    `remarks` VARCHAR(255) NULL,

    INDEX `IX_stock_conversion_outputs_conv`(`stock_conversion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rate_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER UNSIGNED NOT NULL,
    `rate_date` DATE NOT NULL,
    `from_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'USD',
    `to_currency` ENUM('USD', 'INR') NOT NULL DEFAULT 'INR',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `source` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    `source_voucher_type` VARCHAR(30) NULL,
    `source_voucher_id` INTEGER UNSIGNED NULL,
    `remarks` VARCHAR(255) NULL,
    `created_by` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IX_exchange_rate_log_date`(`company_id`, `rate_date`),
    INDEX `IX_exchange_rate_log_pair_date`(`company_id`, `from_currency`, `to_currency`, `rate_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `financial_years` ADD CONSTRAINT `financial_years_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_groups` ADD CONSTRAINT `account_groups_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_groups` ADD CONSTRAINT `account_groups_parent_group_id_fkey` FOREIGN KEY (`parent_group_id`) REFERENCES `account_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_account_group_id_fkey` FOREIGN KEY (`account_group_id`) REFERENCES `account_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `broker_profiles` ADD CONSTRAINT `broker_profiles_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualities` ADD CONSTRAINT `qualities_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_gst_history` ADD CONSTRAINT `quality_gst_history_quality_id_fkey` FOREIGN KEY (`quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoices` ADD CONSTRAINT `sale_invoices_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoices` ADD CONSTRAINT `sale_invoices_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoices` ADD CONSTRAINT `sale_invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoices` ADD CONSTRAINT `sale_invoices_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoices` ADD CONSTRAINT `sale_invoices_reference_invoice_id_fkey` FOREIGN KEY (`reference_invoice_id`) REFERENCES `sale_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoice_items` ADD CONSTRAINT `sale_invoice_items_sale_invoice_id_fkey` FOREIGN KEY (`sale_invoice_id`) REFERENCES `sale_invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_invoice_items` ADD CONSTRAINT `sale_invoice_items_quality_id_fkey` FOREIGN KEY (`quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_reference_invoice_id_fkey` FOREIGN KEY (`reference_invoice_id`) REFERENCES `purchase_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoice_items` ADD CONSTRAINT `purchase_invoice_items_purchase_invoice_id_fkey` FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoice_items` ADD CONSTRAINT `purchase_invoice_items_quality_id_fkey` FOREIGN KEY (`quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_vouchers` ADD CONSTRAINT `challan_vouchers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_vouchers` ADD CONSTRAINT `challan_vouchers_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_vouchers` ADD CONSTRAINT `challan_vouchers_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_items` ADD CONSTRAINT `challan_items_challan_voucher_id_fkey` FOREIGN KEY (`challan_voucher_id`) REFERENCES `challan_vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challan_items` ADD CONSTRAINT `challan_items_quality_id_fkey` FOREIGN KEY (`quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_vouchers` ADD CONSTRAINT `journal_vouchers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_vouchers` ADD CONSTRAINT `journal_vouchers_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_voucher_lines` ADD CONSTRAINT `journal_voucher_lines_journal_voucher_id_fkey` FOREIGN KEY (`journal_voucher_id`) REFERENCES `journal_vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_voucher_lines` ADD CONSTRAINT `journal_voucher_lines_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_voucher_lines` ADD CONSTRAINT `journal_voucher_lines_outstanding_bill_id_fkey` FOREIGN KEY (`outstanding_bill_id`) REFERENCES `outstanding_bills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_bank_vouchers` ADD CONSTRAINT `cash_bank_vouchers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_bank_vouchers` ADD CONSTRAINT `cash_bank_vouchers_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_bank_vouchers` ADD CONSTRAINT `cash_bank_vouchers_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_bank_vouchers` ADD CONSTRAINT `cash_bank_vouchers_cash_bank_account_id_fkey` FOREIGN KEY (`cash_bank_account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_bank_allocations` ADD CONSTRAINT `cash_bank_allocations_cash_bank_voucher_id_fkey` FOREIGN KEY (`cash_bank_voucher_id`) REFERENCES `cash_bank_vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_bank_allocations` ADD CONSTRAINT `cash_bank_allocations_outstanding_bill_id_fkey` FOREIGN KEY (`outstanding_bill_id`) REFERENCES `outstanding_bills`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_vouchers` ADD CONSTRAINT `job_vouchers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_vouchers` ADD CONSTRAINT `job_vouchers_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_vouchers` ADD CONSTRAINT `job_vouchers_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_vouchers` ADD CONSTRAINT `job_vouchers_subcontractor_party_id_fkey` FOREIGN KEY (`subcontractor_party_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_voucher_items` ADD CONSTRAINT `job_voucher_items_job_voucher_id_fkey` FOREIGN KEY (`job_voucher_id`) REFERENCES `job_vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_voucher_items` ADD CONSTRAINT `job_voucher_items_quality_id_fkey` FOREIGN KEY (`quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cost_entries` ADD CONSTRAINT `job_cost_entries_job_voucher_id_fkey` FOREIGN KEY (`job_voucher_id`) REFERENCES `job_vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_cost_entries` ADD CONSTRAINT `job_cost_entries_stock_packet_id_fkey` FOREIGN KEY (`stock_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `general_ledger_entries` ADD CONSTRAINT `general_ledger_entries_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `general_ledger_entries` ADD CONSTRAINT `general_ledger_entries_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outstanding_bills` ADD CONSTRAINT `outstanding_bills_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outstanding_bills` ADD CONSTRAINT `outstanding_bills_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_reconciliations` ADD CONSTRAINT `bank_reconciliations_cash_bank_voucher_id_fkey` FOREIGN KEY (`cash_bank_voucher_id`) REFERENCES `cash_bank_vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_packets` ADD CONSTRAINT `stock_packets_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_packets` ADD CONSTRAINT `stock_packets_quality_id_fkey` FOREIGN KEY (`quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_packets` ADD CONSTRAINT `stock_packets_source_packet_id_fkey` FOREIGN KEY (`source_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_stock_packet_id_fkey` FOREIGN KEY (`stock_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_stock_packet_id_fkey` FOREIGN KEY (`stock_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_challan_voucher_id_fkey` FOREIGN KEY (`challan_voucher_id`) REFERENCES `challan_vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_media` ADD CONSTRAINT `stock_media_stock_packet_id_fkey` FOREIGN KEY (`stock_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_number_configs` ADD CONSTRAINT `voucher_number_configs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_number_configs` ADD CONSTRAINT `voucher_number_configs_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_number_sequences` ADD CONSTRAINT `voucher_number_sequences_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_number_sequences` ADD CONSTRAINT `voucher_number_sequences_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `print_templates` ADD CONSTRAINT `print_templates_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_permission_template_id_fkey` FOREIGN KEY (`permission_template_id`) REFERENCES `permission_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_company_access` ADD CONSTRAINT `user_company_access_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_company_access` ADD CONSTRAINT `user_company_access_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_permissions` ADD CONSTRAINT `page_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_permissions` ADD CONSTRAINT `page_permissions_permission_template_id_fkey` FOREIGN KEY (`permission_template_id`) REFERENCES `permission_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `module_permissions` ADD CONSTRAINT `module_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `module_permissions` ADD CONSTRAINT `module_permissions_permission_template_id_fkey` FOREIGN KEY (`permission_template_id`) REFERENCES `permission_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `login_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_records` ADD CONSTRAINT `notification_records_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_records` ADD CONSTRAINT `notification_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_workspaces` ADD CONSTRAINT `user_workspaces_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_financial_year_id_fkey` FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_cash_bank_account_id_fkey` FOREIGN KEY (`cash_bank_account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_repayments` ADD CONSTRAINT `loan_repayments_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_repayments` ADD CONSTRAINT `loan_repayments_cash_bank_account_id_fkey` FOREIGN KEY (`cash_bank_account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_conversions` ADD CONSTRAINT `stock_conversions_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_conversions` ADD CONSTRAINT `stock_conversions_source_packet_id_fkey` FOREIGN KEY (`source_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_conversions` ADD CONSTRAINT `stock_conversions_source_quality_id_fkey` FOREIGN KEY (`source_quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_conversion_outputs` ADD CONSTRAINT `stock_conversion_outputs_stock_conversion_id_fkey` FOREIGN KEY (`stock_conversion_id`) REFERENCES `stock_conversions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_conversion_outputs` ADD CONSTRAINT `stock_conversion_outputs_output_packet_id_fkey` FOREIGN KEY (`output_packet_id`) REFERENCES `stock_packets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_conversion_outputs` ADD CONSTRAINT `stock_conversion_outputs_output_quality_id_fkey` FOREIGN KEY (`output_quality_id`) REFERENCES `qualities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_rate_logs` ADD CONSTRAINT `exchange_rate_logs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

