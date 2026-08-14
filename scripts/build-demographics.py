#!/usr/bin/env python3
"""Convert the official Shinagawa monthly population workbook/CSV into app JSON.

The legacy .xls workbook should first be converted to .xlsx. This script writes
JavaScript to stdout so the generated file can be reviewed before replacement.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import openpyxl


def normalize_chome(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).strip()
    text = text.replace("丁目", "")
    return text if text not in {"nan", "-", "－"} else ""


def number(value: object) -> int:
    text = unicodedata.normalize("NFKC", str(value or "")).replace(",", "").strip()
    return int(float(text)) if re.fullmatch(r"\d+(?:\.0+)?", text) else 0


def read_households(path: Path) -> dict[str, dict[str, int | str]]:
    sheet = openpyxl.load_workbook(path, data_only=True).active
    rows = list(sheet.iter_rows(values_only=True))
    result: dict[str, dict[str, int | str]] = {}

    for name_cols, chome_col, households_col, population_col, male_col, female_col in (
        ((0, 1), 5, 8, 12, 16, 20),
        ((24, 25), 29, 32, 36, 40, 44),
    ):
        current_town = ""
        for row in rows[16:]:
            candidates = [str(row[index]).strip() for index in name_cols if index < len(row) and row[index] not in (None, "")]
            if candidates:
                candidate = candidates[-1].replace(" ", "").replace("　", "")
                if "地区" not in candidate and "町丁" not in candidate and not candidate.startswith("○"):
                    current_town = candidate
            chome = normalize_chome(row[chome_col] if chome_col < len(row) else "")
            households = number(row[households_col] if households_col < len(row) else 0)
            population = number(row[population_col] if population_col < len(row) else 0)
            if current_town and chome and (households or population):
                name = f"{current_town}{chome}丁目"
                result[name] = {
                    "name": name,
                    "town": current_town,
                    "chome": int(chome),
                    "households": households,
                    "population": population,
                    "male": number(row[male_col] if male_col < len(row) else 0),
                    "female": number(row[female_col] if female_col < len(row) else 0),
                }
    return result


def read_ages(path: Path) -> dict[str, list[dict[str, int | str]]]:
    buckets: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            town = row.get("大字・町名", "").strip()
            chome = normalize_chome(row.get("字・丁目名", ""))
            if not town or not chome:
                continue
            age = number(row.get("最小年齢", 0))
            value = number(row.get("人口", 0))
            label = "0〜14歳" if age <= 14 else "15〜64歳" if age <= 64 else "65歳以上"
            buckets[f"{town}{chome}丁目"][label] += value
    return {name: [{"label": label, "value": values[label]} for label in ("0〜14歳", "15〜64歳", "65歳以上")] for name, values in buckets.items()}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("ages", type=Path)
    parser.add_argument("--as-of", default="2026-08-01")
    args = parser.parse_args()
    households = read_households(args.workbook)
    ages = read_ages(args.ages)
    records = []
    for name, record in sorted(households.items()):
        record["ageGroups"] = ages.get(name, [])
        records.append(record)
    print("// Generated from Shinagawa City official monthly statistics.\n")
    print(f"export const DEMOGRAPHICS_AS_OF = {json.dumps(args.as_of, ensure_ascii=False)};")
    print("export const DEMOGRAPHICS = " + json.dumps(records, ensure_ascii=False, indent=2) + ";")


if __name__ == "__main__":
    main()
