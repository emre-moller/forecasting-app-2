"""
Transformation service for converting between yearly API format and monthly database format.
"""
from typing import List, Dict, Any, Tuple
from datetime import date


MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']


def encode_forecast_id(project_id: int, year: int) -> str:
    """
    Create a logical forecast ID from project_id and year.

    Args:
        project_id: The project ID
        year: The year (e.g., 2026)

    Returns:
        Encoded forecast ID (e.g., "1_2026")
    """
    return f"{project_id}_{year}"


def decode_forecast_id(forecast_id: str) -> Tuple[int, int]:
    """
    Parse project_id and year from encoded forecast ID.

    Args:
        forecast_id: Encoded forecast ID (e.g., "1_2026")

    Returns:
        Tuple of (project_id, year)

    Raises:
        ValueError: If forecast_id format is invalid
    """
    try:
        parts = forecast_id.split('_')
        if len(parts) != 2:
            raise ValueError(f"Invalid forecast_id format: {forecast_id}")
        project_id = int(parts[0])
        year = int(parts[1])
        return project_id, year
    except (ValueError, IndexError) as e:
        raise ValueError(f"Invalid forecast_id format: {forecast_id}") from e


def yearly_forecast_to_monthly_records(yearly_data: Dict[str, Any], year: int = 2026) -> List[Dict[str, Any]]:
    """
    Convert yearly forecast with 12 month fields to 12 monthly record dictionaries.

    Args:
        yearly_data: Dictionary containing monthly fields (jan, feb, mar, etc.)
        year: The year for these records (default: 2026)

    Returns:
        List of 12 dictionaries, one per month
    """
    records = []

    for month_num, month_name in enumerate(MONTH_NAMES, start=1):
        amount = yearly_data.get(month_name, 0.0)
        if amount is None:
            amount = 0.0

        record = {
            'month': month_num,
            'amount': float(amount),
            'year': year,
            # Copy common fields
            'department_id': yearly_data.get('department_id') or yearly_data.get('departmentId'),
            'project_id': yearly_data.get('project_id') or yearly_data.get('projectId'),
            'project_name': yearly_data.get('project_name') or yearly_data.get('projectName'),
            'profit_center': yearly_data.get('profit_center') or yearly_data.get('profitCenter'),
            'wbs': yearly_data.get('wbs'),
            'account': yearly_data.get('account'),
        }
        records.append(record)

    return records


def monthly_records_to_yearly_forecast(monthly_records: List[Any]) -> Dict[str, Any]:
    """
    Convert 12 monthly records to yearly forecast dictionary with jan-dec fields.

    Args:
        monthly_records: List of ForecastMonth or ForecastSnapshotMonth objects

    Returns:
        Dictionary with yearly view (jan, feb, mar... dec, total, yearly_sum)
    """
    if not monthly_records:
        raise ValueError("No monthly records provided")

    # Sort by month to ensure correct order
    sorted_records = sorted(monthly_records, key=lambda r: r.month)

    # Build yearly dictionary
    yearly = {}
    total = 0.0

    # Extract monthly amounts
    for record in sorted_records:
        if 1 <= record.month <= 12:
            month_name = MONTH_NAMES[record.month - 1]
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

    # Copy common fields from first record
    first_record = sorted_records[0]
    yearly['department_id'] = first_record.department_id
    yearly['project_id'] = first_record.project_id
    yearly['project_name'] = first_record.project_name
    yearly['profit_center'] = first_record.profit_center
    yearly['wbs'] = first_record.wbs
    yearly['account'] = first_record.account

    # Handle created_by and timestamps
    if hasattr(first_record, 'created_by'):
        yearly['created_by'] = first_record.created_by
    if hasattr(first_record, 'created_at'):
        yearly['created_at'] = first_record.created_at
    if hasattr(first_record, 'updated_at'):
        yearly['updated_at'] = first_record.updated_at

    # Generate forecast ID
    if hasattr(first_record, 'year'):
        yearly['id'] = encode_forecast_id(first_record.project_id, first_record.year)

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
    sorted_records = sorted(snapshot_header.monthly_snapshots, key=lambda r: r.month)

    # Build yearly dictionary from monthly records
    yearly = {}
    total = 0.0

    # Extract monthly amounts
    for record in sorted_records:
        if 1 <= record.month <= 12:
            month_name = MONTH_NAMES[record.month - 1]
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

    # Get common fields from first monthly record (project details)
    if sorted_records:
        first_record = sorted_records[0]
        yearly['project_name'] = first_record.project_name
        yearly['profit_center'] = first_record.profit_center
        yearly['wbs'] = first_record.wbs
        yearly['account'] = first_record.account

    # Add snapshot-specific fields from header
    yearly['id'] = snapshot_header.id
    yearly['forecast_id'] = encode_forecast_id(snapshot_header.project_id, snapshot_header.year)
    yearly['is_approved'] = snapshot_header.is_approved
    yearly['snapshot_date'] = snapshot_header.snapshot_date
    yearly['submitted_by'] = snapshot_header.submitted_by
    yearly['approved_by'] = snapshot_header.approved_by
    yearly['approved_at'] = snapshot_header.approved_at
    yearly['department_id'] = snapshot_header.department_id
    yearly['project_id'] = snapshot_header.project_id
    yearly['year'] = snapshot_header.year

    return yearly
