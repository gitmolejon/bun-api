## Query para sacar `rawPlaces.json`

```sql
-- Booker
SELECT z.island, p.zone_id, p.name, p.coordinates
FROM places p
LEFT JOIN zones z ON p.zone_id = z.id 
WHERE p.show_web = 1 AND p.coordinates != '';
```

## Query para sacar precios disponibles de shuttle

```sql
-- Booker
SELECT 
	bt.island,
	bt.start_zone_id as airport_id,
	bt.end_zone_id as zone_id,
	CASE 
		WHEN bt.start_zone_id = 201 THEN 'TFN'
		WHEN bt.start_zone_id = 210 THEN 'TFS'
	    WHEN bt.island = 'GC' THEN 'LPA'
	    WHEN bt.island = 'LZ' THEN 'ACE'
	    WHEN bt.island = 'FV' THEN 'FUE'
	    WHEN bt.island = 'LP' THEN 'SPC'
	    WHEN bt.island = 'EH' THEN 'VDE'
	    WHEN bt.island = 'LG' THEN 'GMZ'
	    -- ELSE 'Other'
	END AS airport,
	bt.name as zone_name,
	price_adult as price
FROM billing_templates bt
INNER JOIN (
    SELECT auto_identifier, MAX(available_from) AS max_available_from
    FROM billing_templates
    WHERE service_type_id = 1
    AND client_id = 1944
    AND deleted = 0
    AND available_from <= '2024-01-11'
    GROUP BY auto_identifier
) AS subquery
ON bt.auto_identifier = subquery.auto_identifier AND bt.available_from = subquery.max_available_from
WHERE bt.service_type_id = 1
AND bt.client_id = 1944
AND bt.deleted = 0
AND bt.available_from <= '2024-01-11'
ORDER BY bt.available_from DESC;
```