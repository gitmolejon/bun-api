## Query para sacar `rawPlaces.json`

```sql
-- Booker
SELECT z.island, p.zone_id, p.name, p.coordinates
FROM places p
LEFT JOIN zones z ON p.zone_id = z.id 
WHERE p.show_web = 1 AND p.coordinates != '';
```