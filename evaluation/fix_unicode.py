#!/usr/bin/env python3
"""Fix non-ASCII characters in master_execution.py"""
import re

path = "evaluation/master_execution.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace all non-ASCII with ASCII equivalents
# Common Unicode -> ASCII mapping
mapping = {
    0x2014: "--",   # em dash
    0x2013: "-",    # en dash
    0x2500: "-",    # box drawing
    0x2550: "=",    # double box
    0x00D7: "x",    # multiplication
    0x2264: "<=",   # less/equal
    0x2265: ">=",   # greater/equal
    0x221E: "inf",  # infinity
    0x2211: "Sum",  # summation
    0x03A3: "Sum",  # sigma
    0x2193: "v",    # down arrow
    0x2191: "^",    # up arrow
    0x2190: "<-",   # left arrow
    0x2193: "v",    # down arrow
    0x2015: "--",   # horizontal bar
    0x2212: "-",    # minus
    0x0302: "",     # combining circumflex
    0x0304: "",     # combining macron
    0x0327: "",     # combining cedilla
    0x0308: "",     # combining diaeresis
}

out = []
count = 0
for ch in content:
    cp = ord(ch)
    if cp > 127:
        if cp in mapping:
            out.append(mapping[cp])
            count += 1
        else:
            # Keep it if it's a legitimate character we want
            out.append(ch)
    else:
        out.append(ch)

result = "".join(out)
with open(path, "w", encoding="utf-8") as f:
    f.write(result)

print(f"Fixed {count} characters")

# Check remaining
remaining = {}
for i, line in enumerate(result.split("\n"), 1):
    for j, ch in enumerate(line):
        if ord(ch) > 127:
            remaining[hex(ord(ch))] = remaining.get(hex(ord(ch)), 0) + 1

if remaining:
    print(f"Remaining non-ASCII: {remaining}")
else:
    print("All non-ASCII removed")
