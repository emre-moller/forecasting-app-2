"""
Transformation service for converting between yearly API format and monthly database format.
Adapted for Snowflake fdwh_forecast schema.
"""
from typing import List, Dict, Any, Tuple, Optional
from datetime import date, datetime


MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']


def generate_forecast_key(profitcenter: Optional[int], wbs: Optional[str], account_number: Optional[int], year: str) -> str:
    """
    Generate a composite forecast key (without month) for grouping.

    Format: {profitcenter}_{wbs}_{account}_{year}

    Args:
        profitcenter: Profit center number
        wbs: Work breakdown structure
        account_number: Account number
        year: Year as string (e.g., "2026")

    Returns:
        Composite key string
    """
    pc = str(profitcenter) if profitcenter is not None else "0"
    w = wbs if wbs else ""
    acc = str(account_number) if account_number is not None else "0"
    return f"{pc}_{w}_{acc}_{year}"


def generate_pk(profitcenter: Optional[int], wbs: Optional[str], account_number: Optional[int], year: str, month: str) -> str:
    """
    Generate a composite primary key for a single monthly record.

    Format: {profitcenter}_{wbs}_{account}_{year}_{month}

    Args:
        profitcenter: Profit center number
        wbs: Work breakdown structure
        account_number: Account number
        year: Year as string (e.g., "2026")
        month: Month as string (e.g., "01", "02", ..., "12")

    Returns:
        Composite primary key string
    """
    base_key = generate_forecast_key(profitcenter, wbs, account_number, year)
    return f"{base_key}_{month}"


def generate_period(year: str, month: str) -> str:
    """
    Generate period in YYYY-MM format.

    Args:
        year: Year as string (e.g., "2026")
        month: Month as string (e.g., "01", "02", ..., "12")

    Returns:
        Period string (e.g., "2026-01")
    """
    return f"{year}-{month}"


def month_int_to_str(month_num: int) -> str:
    """
    Convert month number (1-12) to zero-padded string ("01"-"12").
    """
    return str(month_num).zfill(2)


def month_str_to_int(month_str: str) -> int:
    """
    Convert month string ("01"-"12") to integer (1-12).
    """
    return int(month_str)


def yearly_forecast_to_monthly_records(yearly_data: Dict[str, Any], year: str = "2026") -> List[Dict[str, Any]]:
    """
    Convert yearly forecast with 12 month fields to 12 monthly record dictionaries.
    Generates PK and PERIOD for each record matching Snowflake schema.

    Args:
        yearly_data: Dictionary containing monthly fields (jan, feb, mar, etc.)
        year: The year for these records (default: "2026")

    Returns:
        List of 12 dictionaries matching fdwh_forecast schema
    """
    # Extract core identifying fields
    profitcenter = yearly_data.get('profitcenter')
    wbs = yearly_data.get('wbs')
    account_number = yearly_data.get('account_number') or yearly_data.get('accountNumber')
    source = yearly_data.get('source', 'MANUAL')
    load_start_ts = datetime.utcnow().isoformat()

    records = []

    for month_num, month_name in enumerate(MONTH_NAMES, start=1):
        amount = yearly_data.get(month_name, 0.0)
        if amount is None:
            amount = 0.0

        month_str = month_int_to_str(month_num)

        record = {
            'pk': generate_pk(profitcenter, wbs, account_number, year, month_str),
            'profitcenter': profitcenter,
            'wbs': wbs,
            'account_number': account_number,
            'year': year,
            'month': month_str,
            'source': source,
            'load_start_ts': load_start_ts,
            'amount': float(amount),
            'period': generate_period(year, month_str),
            # DBT fields left as None - populated by Snowflake/DBT
            'dbt_scd_id': None,
            'dbt_updated_at': None,
            'dbt_valid_from': None,
            'dbt_valid_to': None,
        }
        records.append(record)

    return records


def extract_metadata_from_yearly(yearly_data: Dict[str, Any], year: str = "2026") -> Dict[str, Any]:
    """
    Extract UI metadata from yearly forecast data.

    Args:
        yearly_data: Dictionary containing yearly forecast data
        year: The year for the forecast

    Returns:
        Dictionary with metadata fields for forecast_metadata table
    """
    profitcenter = yearly_data.get('profitcenter')
    wbs = yearly_data.get('wbs')
    account_number = yearly_data.get('account_number') or yearly_data.get('accountNumber')

    return {
        'forecast_key': generate_forecast_key(profitcenter, wbs, account_number, year),
        'department_id': yearly_data.get('department_id') or yearly_data.get('departmentId'),
        'project_id': yearly_data.get('project_id') or yearly_data.get('projectId'),
        'project_name': yearly_data.get('project_name') or yearly_data.get('projectName'),
        'created_by': yearly_data.get('created_by') or yearly_data.get('createdBy', 'System'),
        'created_at': date.today(),
        'updated_at': date.today(),
    }


def monthly_records_to_yearly_forecast(monthly_records: List[Any], metadata: Any = None) -> Dict[str, Any]:
    """
    Convert 12 monthly records to yearly forecast dictionary with jan-dec fields.

    Args:
        monthly_records: List of FdwhForecast objects
        metadata: Optional ForecastMetadata object for UI fields

    Returns:
        Dictionary with yearly view (jan, feb, mar... dec, total, yearly_sum)
    """
    if not monthly_records:
        raise ValueError("No monthly records provided")

    # Sort by month to ensure correct order
    sorted_records = sorted(monthly_records, key=lambda r: int(r.month) if isinstance(r.month, str) else r.month)

    # Build yearly dictionary
    yearly = {}
    total = 0.0

    # Extract monthly amounts
    for record in sorted_records:
        month_num = int(record.month) if isinstance(record.month, str) else record.month
        if 1 <= month_num <= 12:
            month_name = MONTH_NAMES[month_num - 1]
            amount = float(record.amount) if record.amount is not None else 0.0
            yearly[month_name] = amount
            total += amount

    # Fill in any missing months with 0
    for month_name in MONTH_NAMES:
        if month_name not in yearly:
            yearly[month_name] = 0.0

    # Add totals
    yearly['total'] = total
    yearly['yearly_sum'] = total

    # Copy Snowflake-compatible fields from first record
    first_record = sorted_records[0]
    yearly['profitcenter'] = first_record.profitcenter
    yearly['wbs'] = first_record.wbs
    yearly['account_number'] = first_record.account_number
    yearly['year'] = first_record.year
    yearly['source'] = first_record.source

    # DBT fields
    yearly['dbt_updated_at'] = first_record.dbt_updated_at
    yearly['dbt_valid_from'] = first_record.dbt_valid_from
    yearly['dbt_valid_to'] = first_record.dbt_valid_to
    yearly['period'] = first_record.period

    # Generate forecast ID (composite key without month)
    yearly['id'] = generate_forecast_key(
        first_record.profitcenter,
        first_record.wbs,
        first_record.account_number,
        first_record.year
    )

    # Add metadata fields if provided
    if metadata:
        yearly['department_id'] = metadata.department_id
        yearly['project_id'] = metadata.project_id
        yearly['project_name'] = metadata.project_name
        yearly['created_by'] = metadata.created_by
        yearly['created_at'] = metadata.created_at
        yearly['updated_at'] = metadata.updated_at
    else:
        # Default values when no metadata
        yearly['department_id'] = None
        yearly['project_id'] = None
        yearly['project_name'] = None
        yearly['created_by'] = None
        yearly['created_at'] = None
        yearly['updated_at'] = None

    return yearly


def snapshot_header_to_yearly_view(snapshot_header: Any) -> Dict[str, Any]:
    """
    Convert snapshot header with monthly records to yearly view.

    Args:
        snapshot_header: ForecastSnapshotHeader object with monthly_snapshots relationship

    Returns:
        Dictionary with yearly view including approval metadata
    """
    if not hasattr(snapshot_header, 'monthly_snapshots') or not snapshot_header.monthly_snapshots:
        raise ValueError("Snapshot header has no monthly records")

    # Sort monthly records
    sorted_records = sorted(
        snapshot_header.monthly_snapshots,
        key=lambda r: int(r.month) if isinstance(r.month, str) else r.month
    )

    # Build yearly dictionary from monthly records
    yearly = {}
    total = 0.0

    # Extract monthly amounts
    for record in sorted_records:
        month_num = int(record.month) if isinstance(record.month, str) else record.month
        if 1 <= month_num <= 12:
            month_name = MONTH_NAMES[month_num - 1]
            amount = float(record.amount) if record.amount is not None else 0.0
            yearly[month_name] = amount
            total += amount

    # Fill in any missing months with 0
    for month_name in MONTH_NAMES:
        if month_name not in yearly:
            yearly[month_name] = 0.0

    # Add totals
    yearly['total'] = total
    yearly['yearly_sum'] = total

    # Snowflake-compatible fields from header
    yearly['profitcenter'] = snapshot_header.profitcenter
    yearly['wbs'] = snapshot_header.wbs
    yearly['account_number'] = snapshot_header.account_number
    yearly['year'] = snapshot_header.year

    # UI metadata from header
    yearly['project_name'] = snapshot_header.project_name
    yearly['department_id'] = snapshot_header.department_id
    yearly['project_id'] = snapshot_header.project_id

    # Add snapshot-specific fields from header
    yearly['id'] = snapshot_header.id
    yearly['forecast_id'] = snapshot_header.forecast_key
    yearly['batch_id'] = snapshot_header.batch_id
    yearly['is_approved'] = snapshot_header.is_approved
    yearly['snapshot_date'] = snapshot_header.snapshot_date
    yearly['submitted_by'] = snapshot_header.submitted_by
    yearly['approved_by'] = snapshot_header.approved_by
    yearly['approved_at'] = snapshot_header.approved_at

    return yearly


def parse_forecast_key(forecast_key: str) -> Tuple[Optional[int], Optional[str], Optional[int], str]:
    """
    Parse a composite forecast key back into its components.

    Args:
        forecast_key: Composite key in format {profitcenter}_{wbs}_{account}_{year}

    Returns:
        Tuple of (profitcenter, wbs, account_number, year)
    """
    parts = forecast_key.split('_')
    if len(parts) < 4:
        raise ValueError(f"Invalid forecast_key format: {forecast_key}")

    # Last part is always year
    year = parts[-1]
    # Third-to-last is account
    account_str = parts[-2]
    # Everything between first and third-to-last is WBS (may contain underscores)
    profitcenter_str = parts[0]
    wbs = '_'.join(parts[1:-2]) if len(parts) > 4 else parts[1]

    profitcenter = int(profitcenter_str) if profitcenter_str and profitcenter_str != "0" else None
    account_number = int(account_str) if account_str and account_str != "0" else None
    # Keep wbs as-is (empty string stays empty string, not converted to None)
    # This ensures consistent matching with database values

    return (profitcenter, wbs, account_number, year)
