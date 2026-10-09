"""Private, read-only Stripe event persistence verification.

Run inside the billing container using Railway's shell, never over HTTP:
  python -m billing.verify_event_storage evt_...

Output is sanitized and never contains event IDs, customer data or secrets.
"""
import os
import sqlite3
import sys
from pathlib import Path


def verify(db_path: str, event_id: str) -> dict:
    if not event_id.startswith('evt_') or len(event_id) > 255:
        raise ValueError('invalid event identifier')
    if not Path(db_path).is_file():
        raise FileNotFoundError('database file missing')
    # Read-only connection: never initialize or mutate the production database.
    db_uri = Path(db_path).resolve().as_uri() + '?mode=ro'
    with sqlite3.connect(db_uri, uri=True, timeout=5) as db:
        receipt_count = db.execute('SELECT COUNT(*) FROM stripe_events WHERE event_id=?', (event_id,)).fetchone()[0]
        projection_count = db.execute('SELECT COUNT(*) FROM billing_object_events WHERE event_id=?', (event_id,)).fetchone()[0]
        event_type = db.execute('SELECT event_type FROM stripe_events WHERE event_id=?', (event_id,)).fetchone()
    return {
        'receipt_count': receipt_count,
        'projection_count': projection_count,
        'expected_event_type': bool(event_type and event_type[0] == 'checkout.session.completed'),
        'verified_once': receipt_count == 1 and projection_count == 1,
    }


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print('Usage: python -m billing.verify_event_storage evt_...', file=sys.stderr)
        return 2
    try:
        result = verify(os.environ.get('BILLING_DB_PATH', '/data/billing.sqlite'), args[0])
    except (OSError, sqlite3.Error, ValueError) as exc:
        print('Verification unavailable: ' + type(exc).__name__, file=sys.stderr)
        return 2
    for key, value in result.items():
        print(f'{key}={value}')
    return 0 if result['verified_once'] and result['expected_event_type'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
