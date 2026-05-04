SELECT 
    h."herb_name" AS planta,
    s."sym_name" AS sintoma,
    t."tre_prepare" AS preparacion,
    t."tre_apply" AS aplicacion,
	h."herb_important" AS importante
FROM "tbl_herb" h
INNER JOIN "tbl_treatment" t ON h.herb_id = t."herb_id"
INNER JOIN "tbl_symptom" s ON t."symptom_id" = s."symptom_id"
ORDER BY h."herb_name";