ALTER FUNCTION public._report_biz_tz() SET search_path = public;
ALTER FUNCTION public._report_paid_statuses() SET search_path = public;
ALTER FUNCTION public._report_pending_statuses() SET search_path = public;
ALTER FUNCTION public._report_pct_change(numeric, numeric) SET search_path = public;
ALTER FUNCTION public._report_validate_period(timestamptz, timestamptz, int) SET search_path = public;