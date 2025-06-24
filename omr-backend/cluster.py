def sort_key(block):
    x1, y1, *_ = block
    return (x1 // 50) * 10000 + y1

def split_rows_by_cluster(coords, max_gap=25):
    if not coords:
        return []
    coords = sorted(coords, key=lambda c: c[1])
    rows = [[coords[0]]]
    for i in range(1, len(coords)):
        if abs(coords[i][1] - coords[i-1][1]) <= max_gap:
            rows[-1].append(coords[i])
        else:
            rows.append([coords[i]])
    return rows