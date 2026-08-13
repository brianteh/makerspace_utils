import os
import sqlite3
import sys
import time
from pathlib import Path

import bambulabs_api as bl

DB_PATH = os.getenv(
    'PRINTER_DB_PATH',
    str(Path(__file__).resolve().parent.parent / 'server' / 'data' / 'db.sqlite3'),
)
SLEEP_SECONDS = int(os.getenv('POLL_INTERVAL', '30'))


def map_status(state):
    name = getattr(state, 'name', str(state)).upper()

    if name == 'IDLE':
        return 'idle'
    if name == 'FAILED':
        return 'error'
    if name == 'UNKNOWN':
        return 'offline'
    if 'PAUSE' in name:
        return 'printing'

    return 'printing'


def fetch_printers(conn):
    return conn.execute(
        'SELECT id, ip, serial, accessCode FROM printers WHERE ip IS NOT NULL AND serial IS NOT NULL AND accessCode IS NOT NULL'
    ).fetchall()


def poll_printer(printer_id, ip, serial, access_code):
    printer = bl.Printer(ip, access_code, serial)
    printer.connect()
    try:
        time.sleep(2)

        # decoy status, as it will return UNKNOWN for the first time
        printer.get_current_state()

        time.sleep(0.5)

        return map_status(printer.get_current_state())
    finally:
        printer.disconnect()


def update_status(conn, printer_id, status):
    conn.execute(
        'UPDATE printers SET status = ?, statusUpdatedAt = ? WHERE id = ?',
        (status, time.strftime('%Y-%m-%dT%H:%M:%S'), printer_id),
    )
    conn.commit()


def run_once():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    try:
        for printer_id, ip, serial, access_code in fetch_printers(conn):
            try:
                status = poll_printer(printer_id, ip, serial, access_code)
                print(f'{printer_id}: {status}')
            except Exception as exc:
                print(f'{printer_id}: offline ({exc})', file=sys.stderr)
                status = 'offline'
            update_status(conn, printer_id, status)
    finally:
        conn.close()


if __name__ == '__main__':
    print(f'Starting printer status updater')
    print(f'DB: {DB_PATH}')
    print(f'Poll interval: {SLEEP_SECONDS}s')

    run_once()

    if '--once' in sys.argv:
        sys.exit(0)

    while True:
        time.sleep(SLEEP_SECONDS)
        run_once()
