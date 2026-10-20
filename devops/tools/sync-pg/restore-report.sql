with freshness as (
  select
    'roseau.resa.resa_calc_dt' as source,
    max(resa_calc_dt) as latest_ts
  from roseau.resa

  union all

  select
    'roseau.suivqual.suivqual_der_trans_dt',
    max(suivqual_der_trans_dt) at time zone 'Europe/Paris'
  from roseau.suivqual

  union all

  select
    'lanceleau.t_orion_role_for_principal.beginning_date',
    max(beginning_date) at time zone 'Europe/Paris'
  from lanceleau.t_orion_role_for_principal

  union all

  select
    'lanceleau.t_orion_credentials.beginning_date',
    max(beginning_date) at time zone 'Europe/Paris'
  from lanceleau.t_orion_credentials

  union all

  select
    'lanceleau.itv.itv_maj_dt',
    max(itv_maj_dt) at time zone 'Europe/Paris'
  from lanceleau.itv

  union all

  select
    'lanceleau.itv.itv_cre_dt',
    max(itv_cre_dt) at time zone 'Europe/Paris'
  from lanceleau.itv
)
select
  source,
  latest_ts as latest_utc,
  latest_ts at time zone 'Europe/Paris' as latest_paris
from freshness
order by latest_ts desc;
