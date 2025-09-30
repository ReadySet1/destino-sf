-- CreateTable: availability_rules
-- Product availability rule management system
CREATE TABLE public.availability_rules (
    id uuid NOT NULL,
    "productId" uuid NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "ruleType" character varying(50) NOT NULL,
    state character varying(50) NOT NULL,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    seasonal_config jsonb,
    time_restrictions jsonb,
    pre_order_settings jsonb,
    view_only_settings jsonb,
    override_square boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    deleted_at timestamp(3) without time zone
);

-- CreateTable: availability_schedule
-- Scheduled availability state changes
CREATE TABLE public.availability_schedule (
    id uuid NOT NULL,
    "ruleId" uuid NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    state_change character varying(50) NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    processed_at timestamp(3) without time zone,
    error_message text
);

-- AddPrimaryKey: availability_rules
ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_pkey PRIMARY KEY (id);

-- AddPrimaryKey: availability_schedule
ALTER TABLE ONLY public.availability_schedule
    ADD CONSTRAINT availability_schedule_pkey PRIMARY KEY (id);

-- CreateIndex: availability_rules - product and enabled lookup
CREATE INDEX "availability_rules_productId_enabled_idx"
    ON public.availability_rules USING btree ("productId", enabled);

-- CreateIndex: availability_rules - priority ordering
CREATE INDEX "availability_rules_productId_priority_idx"
    ON public.availability_rules USING btree ("productId", priority);

-- CreateIndex: availability_rules - date range queries
CREATE INDEX availability_rules_start_date_end_date_idx
    ON public.availability_rules USING btree (start_date, end_date);

-- CreateIndex: availability_schedule - scheduled jobs lookup
CREATE INDEX availability_schedule_scheduled_at_processed_idx
    ON public.availability_schedule USING btree (scheduled_at, processed);

-- AddForeignKey: availability_rules -> profiles (created_by)
ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- AddForeignKey: availability_rules -> products
ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT "availability_rules_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES public.products(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- AddForeignKey: availability_rules -> profiles (updated_by)
ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- AddForeignKey: availability_schedule -> availability_rules
ALTER TABLE ONLY public.availability_schedule
    ADD CONSTRAINT "availability_schedule_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES public.availability_rules(id)
    ON UPDATE CASCADE ON DELETE CASCADE;
