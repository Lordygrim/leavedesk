--
-- PostgreSQL database dump
--

\restrict 7V2XQn5mHufL0CsI8JH9uzhLgHIHcMOrB35BHGaZzzcLyWaT1jZRaonHPK1am6H

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: leavedesk
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO leavedesk;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: leavedesk
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    actor text NOT NULL,
    action text NOT NULL,
    detail text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO leavedesk;

--
-- Name: Closure; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."Closure" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    name text NOT NULL,
    "startMd" text NOT NULL,
    "endMd" text NOT NULL,
    "endDate" text DEFAULT ''::text NOT NULL,
    repeats boolean DEFAULT true NOT NULL,
    "startDate" text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."Closure" OWNER TO leavedesk;

--
-- Name: Holiday; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."Holiday" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    date text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Holiday" OWNER TO leavedesk;

--
-- Name: LeaveRequest; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."LeaveRequest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "typeId" text NOT NULL,
    "startDate" text NOT NULL,
    "endDate" text NOT NULL,
    "workingDays" integer NOT NULL,
    "reportBackDate" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    note text,
    "decisionReason" text,
    "decidedBy" text,
    "decidedAt" timestamp(3) without time zone,
    "actualReturnDate" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LeaveRequest" OWNER TO leavedesk;

--
-- Name: LeaveType; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."LeaveType" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    name text NOT NULL,
    "daysPerYear" integer NOT NULL,
    quarterly boolean DEFAULT false NOT NULL
);


ALTER TABLE public."LeaveType" OWNER TO leavedesk;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO leavedesk;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    "leavePeriod" text DEFAULT 'QUARTERLY'::text NOT NULL,
    "leaveRule" text DEFAULT 'WINDOW'::text NOT NULL,
    "periodDays" text DEFAULT ''::text NOT NULL,
    "q1Days" integer DEFAULT 6 NOT NULL,
    "q2Days" integer DEFAULT 5 NOT NULL,
    "q3Days" integer DEFAULT 5 NOT NULL,
    "q4Days" integer DEFAULT 5 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requireApproval" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Organization" OWNER TO leavedesk;

--
-- Name: PasswordReset; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."PasswordReset" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PasswordReset" OWNER TO leavedesk;

--
-- Name: PendingAccount; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."PendingAccount" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text,
    "googleId" text,
    name text,
    "tokenHash" text,
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PendingAccount" OWNER TO leavedesk;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    name text NOT NULL,
    "grantsAdmin" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Role" OWNER TO leavedesk;

--
-- Name: User; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "orgId" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "roleId" text NOT NULL,
    department text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "googleId" text,
    "hasPassword" boolean DEFAULT true NOT NULL,
    "isOwner" boolean DEFAULT false NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "managerId" text,
    "joinPending" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."User" OWNER TO leavedesk;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: leavedesk
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO leavedesk;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."AuditLog" (id, "orgId", actor, action, detail, "createdAt") FROM stdin;
\.


--
-- Data for Name: Closure; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."Closure" (id, "orgId", name, "startMd", "endMd", "endDate", repeats, "startDate") FROM stdin;
\.


--
-- Data for Name: Holiday; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."Holiday" (id, "orgId", date, name) FROM stdin;
cmwnevb87000kytvjm4obx5m9	cmwnevaxa0000ytvjb9eyoipj	2026-01-01	New Year's Day
cmwnevb8t000mytvjuextzhgb	cmwnevaxa0000ytvjb9eyoipj	2026-04-03	Good Friday
cmwnevb93000oytvjje9vb5lo	cmwnevaxa0000ytvjb9eyoipj	2026-04-06	Easter Monday
cmwnevb9f000qytvjf0wknxg9	cmwnevaxa0000ytvjb9eyoipj	2026-05-01	Labour Day
cmwnevb9h000sytvjh3gj1k1h	cmwnevaxa0000ytvjb9eyoipj	2026-06-01	Madaraka Day
cmwnevb9k000uytvj9vb0mg95	cmwnevaxa0000ytvjb9eyoipj	2026-10-10	Utamaduni Day
cmwnevb9n000wytvjpu2v07zs	cmwnevaxa0000ytvjb9eyoipj	2026-10-20	Mashujaa Day
cmwnevb9q000yytvjvef7iacu	cmwnevaxa0000ytvjb9eyoipj	2026-12-12	Jamhuri Day
cmwnevb9s0010ytvj5edt3o7m	cmwnevaxa0000ytvjb9eyoipj	2026-12-25	Christmas Day
cmwnevb9y0012ytvjlnhgnjo6	cmwnevaxa0000ytvjb9eyoipj	2026-12-26	Boxing Day
cmwnevba10014ytvjwhleu8yr	cmwnevaxa0000ytvjb9eyoipj	2027-01-01	New Year's Day
cmwnevba50016ytvjdgr0x5rh	cmwnevaxa0000ytvjb9eyoipj	2027-03-26	Good Friday
cmwnevba90018ytvji1vwwy99	cmwnevaxa0000ytvjb9eyoipj	2027-03-29	Easter Monday
cmwnevbac001aytvjqqbxq4ex	cmwnevaxa0000ytvjb9eyoipj	2027-05-01	Labour Day
cmwnevbaf001cytvj1tpzd6l7	cmwnevaxa0000ytvjb9eyoipj	2027-06-01	Madaraka Day
\.


--
-- Data for Name: LeaveRequest; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."LeaveRequest" (id, "userId", "typeId", "startDate", "endDate", "workingDays", "reportBackDate", status, note, "decisionReason", "decidedBy", "decidedAt", "actualReturnDate", "createdAt") FROM stdin;
\.


--
-- Data for Name: LeaveType; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."LeaveType" (id, "orgId", name, "daysPerYear", quarterly) FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."Notification" (id, "userId", title, body, read, "createdAt") FROM stdin;
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."Organization" (id, name, "leavePeriod", "leaveRule", "periodDays", "q1Days", "q2Days", "q3Days", "q4Days", "createdAt", "requireApproval") FROM stdin;
cmwnevaxa0000ytvjb9eyoipj	Keynote Systems Limited	YEARLY	WINDOW	28	6	5	5	5	2026-11-19 10:32:22.03	t
\.


--
-- Data for Name: PasswordReset; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."PasswordReset" (id, "userId", "tokenHash", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: PendingAccount; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."PendingAccount" (id, email, "passwordHash", "googleId", name, "tokenHash", "confirmedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."Role" (id, "orgId", name, "grantsAdmin") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public."User" (id, "orgId", name, email, "passwordHash", "roleId", department, active, "googleId", "hasPassword", "isOwner", "isAdmin", "managerId", "joinPending") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: leavedesk
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
5e848382-e70f-4d98-bfc2-01195be6b261	d61cc86b4f1f1544be882fb8aa6f077d5e206b42b4e6bdcb061c8b6e77655e87	2026-11-17 07:43:41.643917+00	20261113054239_init	\N	\N	2026-11-17 07:43:41.325386+00	1
0f9a6799-c8f5-4bf0-ba49-4e6d9d32193c	85b1b8005de88bcc1f84e08c27800bc8a6d2e26772d80b9e689a2bed8905a5e1	2026-11-17 07:43:41.660936+00	20261114072637_join_organization	\N	\N	2026-11-17 07:43:41.646782+00	1
7221d418-9fc5-4229-8100-8d68883eca82	200b8d85a6cfea1a3fa04ee4a3873c463060c739e6228489b58eb3d7abcf86b5	2026-11-17 07:43:41.678487+00	20261114183625_closure_dates	\N	\N	2026-11-17 07:43:41.663809+00	1
f7e5dc99-63b4-4587-8161-a1d34bb2c27e	9f7aec91d6e9f510ce3f1fb0d7105d1868e2c996e698c9abaec44e7b14df7d2d	2026-11-23 05:51:24.326379+00	20261123055124_add_indexes	\N	\N	2026-11-23 05:51:24.267228+00	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Closure Closure_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Closure"
    ADD CONSTRAINT "Closure_pkey" PRIMARY KEY (id);


--
-- Name: Holiday Holiday_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Holiday"
    ADD CONSTRAINT "Holiday_pkey" PRIMARY KEY (id);


--
-- Name: LeaveRequest LeaveRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY (id);


--
-- Name: LeaveType LeaveType_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."LeaveType"
    ADD CONSTRAINT "LeaveType_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: PasswordReset PasswordReset_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."PasswordReset"
    ADD CONSTRAINT "PasswordReset_pkey" PRIMARY KEY (id);


--
-- Name: PendingAccount PendingAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."PendingAccount"
    ADD CONSTRAINT "PendingAccount_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_orgId_createdAt_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "AuditLog_orgId_createdAt_idx" ON public."AuditLog" USING btree ("orgId", "createdAt");


--
-- Name: Closure_orgId_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "Closure_orgId_idx" ON public."Closure" USING btree ("orgId");


--
-- Name: Holiday_orgId_date_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "Holiday_orgId_date_key" ON public."Holiday" USING btree ("orgId", date);


--
-- Name: LeaveRequest_startDate_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "LeaveRequest_startDate_idx" ON public."LeaveRequest" USING btree ("startDate");


--
-- Name: LeaveRequest_status_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "LeaveRequest_status_idx" ON public."LeaveRequest" USING btree (status);


--
-- Name: LeaveRequest_typeId_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "LeaveRequest_typeId_idx" ON public."LeaveRequest" USING btree ("typeId");


--
-- Name: LeaveRequest_userId_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "LeaveRequest_userId_idx" ON public."LeaveRequest" USING btree ("userId");


--
-- Name: LeaveType_orgId_name_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "LeaveType_orgId_name_key" ON public."LeaveType" USING btree ("orgId", name);


--
-- Name: Notification_userId_read_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "Notification_userId_read_idx" ON public."Notification" USING btree ("userId", read);


--
-- Name: PasswordReset_tokenHash_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON public."PasswordReset" USING btree ("tokenHash");


--
-- Name: PasswordReset_userId_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "PasswordReset_userId_idx" ON public."PasswordReset" USING btree ("userId");


--
-- Name: PendingAccount_email_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "PendingAccount_email_key" ON public."PendingAccount" USING btree (email);


--
-- Name: PendingAccount_tokenHash_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "PendingAccount_tokenHash_key" ON public."PendingAccount" USING btree ("tokenHash");


--
-- Name: Role_orgId_name_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "Role_orgId_name_key" ON public."Role" USING btree ("orgId", name);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleId_key; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId");


--
-- Name: User_managerId_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "User_managerId_idx" ON public."User" USING btree ("managerId");


--
-- Name: User_orgId_idx; Type: INDEX; Schema: public; Owner: leavedesk
--

CREATE INDEX "User_orgId_idx" ON public."User" USING btree ("orgId");


--
-- Name: AuditLog AuditLog_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Closure Closure_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Closure"
    ADD CONSTRAINT "Closure_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Holiday Holiday_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Holiday"
    ADD CONSTRAINT "Holiday_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveRequest LeaveRequest_typeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES public."LeaveType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveRequest LeaveRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LeaveType LeaveType_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."LeaveType"
    ADD CONSTRAINT "LeaveType_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PasswordReset PasswordReset_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."PasswordReset"
    ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Role Role_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leavedesk
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: leavedesk
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 7V2XQn5mHufL0CsI8JH9uzhLgHIHcMOrB35BHGaZzzcLyWaT1jZRaonHPK1am6H

