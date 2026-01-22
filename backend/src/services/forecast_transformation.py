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


def generate_pk(profitcenter: Optional[int], wbs: Optional[str], account_number: Optional[int], year: str, month: str,
                record_type: str = 'LIVE', snapshot_id: str = '0') -> str:
    """
    Generate a composite primary key for a single monthly record.

    Format: {profitcenter}_{wbs}_{account}_{year}_{month}_{record_type}_{snapshot_id}

    Args:
        profitcenter: Profit center number
        wbs: Work breakdown structure
        account_number: Account number
        year: Year as string (e.g., "2026")
        month: Month as string (e.g., "01", "02", ..., "12")
        record_type: 'LIVE' for editable records, 'SNAP' for snapshots
        snapshot_id: '0' for LIVE records, UUID for SNAP records

    Returns:
        Composite primary key string
    """
    base_key = generate_forecast_key(profitcenter, wbs, account_number, year)
    return f"{base_key}_{month}_{record_type}_{snapshot_id}"


def generate_snapshot_id() -> str:
    """
    Generate a unique snapshot ID.

    Returns:
        8-character hex string from UUID
    """
    from uuid import uuid4
    return uuid4().hex[:8]


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


def yearly_forecast_to_monthly_records(
    yearly_data: Dict[str, Any],
    year: str = "2026",
    record_type: str = 'LIVE',
    snapshot_id: str = '0',
    snapshot_metadata: Optional[Dict[str, Any]] = None,
    ui_metadata: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Convert yearly forecast with 12 month fields to 12 monthly record dictionaries.
    Generates PK and PERIOD for each record matching Snowflake schema.

    Args:
        yearly_data: Dictionary containing monthly fields (jan, feb, mar, etc.)
        year: The year for these records (default: "2026")
        record_type: 'LIVE' for editable records, 'SNAP' for snapshots
        snapshot_id: '0' for LIVE records, UUID for SNAP records
        snapshot_metadata: Optional dict with batch_id, submitted_by, snapshot_date, source_forecast_key
        ui_metadata: Optional dict with department_id, project_id, project_name, created_by, created_at, updated_at

    Returns:
        List of 12 dictionaries matching fdwh_forecast schema
    """
    # Extract core identifying fields
    profitcenter = yearly_data.get('profitcenter')
    wbs = yearly_data.get('wbs')
    account_number = yearly_data.get('account_number') or yearly_data.get('accountNumber')
    source = yearly_data.get('source', 'MANUAL')
    load_start_ts = datetime.utcnow().isoformat()

    # Extract UI metadata (can come from yearly_data or ui_metadata parameter)
    department_id = (ui_metadata or {}).get('department_id') or yearly_data.get('department_id') or yearly_data.get('departmentId')
    project_id = (ui_metadata or {}).get('project_id') or yearly_data.get('project_id') or yearly_data.get('projectId')
    project_name = (ui_metadata or {}).get('project_name') or yearly_data.get('project_name') or yearly_data.get('projectName')
    created_by = (ui_metadata or {}).get('created_by') or yearly_data.get('created_by') or yearly_data.get('createdBy')
    created_at = (ui_metadata or {}).get('created_at') or yearly_data.get('created_at')
    updated_at = (ui_metadata or {}).get('updated_at') or yearly_data.get('updated_at') or date.today()

    records = []

    for month_num, month_name in enumerate(MONTH_NAMES, start=1):
        amount = yearly_data.get(month_name, 0.0)
        if amount is None:
            amount = 0.0

        month_str = month_int_to_str(month_num)

        record = {
            'pk': generate_pk(profitcenter, wbs, account_number, year, month_str, record_type, snapshot_id),
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
            # Record type fields
            'record_type': record_type,
            'snapshot_id': snapshot_id,
            # Snapshot-specific fields (NULL for LIVE records)
            'batch_id': snapshot_metadata.get('batch_id') if snapshot_metadata else None,
            'is_approved': snapshot_metadata.get('is_approved', False) if snapshot_metadata else False,
            'snapshot_date': snapshot_metadata.get('snapshot_date') if snapshot_metadata else None,
            'submitted_by': snapshot_metadata.get('submitted_by') if snapshot_metadata else None,
            'approved_by': snapshot_metadata.get('approved_by') if snapshot_metadata else None,
            'approved_at': snapshot_metadata.get('approved_at') if snapshot_metadata else None,
            'source_forecast_key': snapshot_metadata.get('source_forecast_key') if snapshot_metadata else None,
            # UI metadata fields (duplicated on each monthly record for Snowflake persistence)
            'department_id': department_id,
            'project_id': project_id,
            'project_name': project_name,
            'created_by': created_by,
            'created_at': created_at,
            'updated_at': updated_at,
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


def monthly_records_to_yearly_forecast(monthly_records: List[Any]) -> Dict[str, Any]:
    """
    Convert 12 monthly records to yearly forecast dictionary with jan-dec fields.
    Metadata is now extracted directly from the monthly records.

    Args:
        monthly_records: List of FdwhForecast objects (with embedded metadata)

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

    # Extract metadata directly from the forecast records
    yearly['department_id'] = first_record.department_id
    yearly['project_id'] = first_record.project_id
    yearly['project_name'] = first_record.project_name
    yearly['created_by'] = first_record.created_by
    yearly['created_at'] = first_record.created_at
    yearly['updated_at'] = first_record.updated_at

    return yearly


def monthly_records_to_snapshot_view(monthly_records: List[Any]) -> Dict[str, Any]:
    """
    Convert 12 monthly SNAP records to yearly snapshot view with approval metadata.
    Metadata is now extracted directly from the monthly records.

    Args:
        monthly_records: List of FdwhForecast objects with record_type='SNAP' (with embedded metadata)

    Returns:
        Dictionary with yearly view including snapshot-specific fields
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

    # Snapshot ID is the unique identifier
    yearly['id'] = first_record.snapshot_id

    # Source forecast key (composite key without month)
    yearly['forecast_id'] = first_record.source_forecast_key or generate_forecast_key(
        first_record.profitcenter,
        first_record.wbs,
        first_record.account_number,
        first_record.year
    )

    # Snapshot-specific fields from first record
    yearly['batch_id'] = first_record.batch_id
    yearly['is_approved'] = first_record.is_approved
    yearly['snapshot_date'] = first_record.snapshot_date
    yearly['submitted_by'] = first_record.submitted_by
    yearly['approved_by'] = first_record.approved_by
    yearly['approved_at'] = first_record.approved_at

    # Extract metadata directly from the snapshot records
    yearly['department_id'] = first_record.department_id
    yearly['project_id'] = first_record.project_id
    yearly['project_name'] = first_record.project_name

    return yearly


# snapshot_header_to_yearly_view has been replaced by monthly_records_to_snapshot_view
# since snapshots are now stored in the unified fdwh_forecast table


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
