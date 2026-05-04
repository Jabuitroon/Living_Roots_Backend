CREATE OR REPLACE FUNCTION fn_create_herb_with_symptoms_bulk(
    -- Datos de la planta
    p_herb_name VARCHAR,
    p_herb_description TEXT,
    p_herb_img VARCHAR,
    -- Lista de síntomas en formato JSONB
    p_symptoms JSONB, 
    -- Campos opcionales de la planta
    p_herb_cultivator VARCHAR DEFAULT NULL,
    p_herb_important TEXT DEFAULT NULL
)
RETURNS JSON AS $body$
DECLARE
    v_herb_id UUID;
    v_symptom_record RECORD;
    v_current_symptom_id UUID;
    v_created_count INTEGER := 0;
BEGIN
    -- 1. Buscar o Insertar la Planta (Herb)
    SELECT herb_id INTO v_herb_id 
    FROM "tbl_herb" 
    WHERE "herb_name" = p_herb_name;

    IF v_herb_id IS NULL THEN
        v_herb_id := gen_random_uuid();
        INSERT INTO "tbl_herb" (
            "herb_id", "herb_name", "herb_description", "herb_img", 
            "herb_cultivator", "herb_important", "created_at", "updated_at"
        )
        VALUES (
            v_herb_id, p_herb_name, p_herb_description, p_herb_img, 
            p_herb_cultivator, p_herb_important, NOW(), NOW()
        );
    END IF;

    -- 2. Iterar sobre el arreglo de síntomas
    -- Esperamos un JSONB como: [{"name": "Tos", "description": "...", "prepare": "...", "apply": "..."}]
    FOR v_symptom_record IN 
        SELECT * FROM jsonb_to_recordset(p_symptoms) 
        AS x(name VARCHAR, description TEXT, parts_plant TEXT, prepare TEXT, apply TEXT)
    LOOP
        -- a. Buscar o crear el síntoma
        SELECT symptom_id INTO v_current_symptom_id 
        FROM "tbl_symptom" 
        WHERE "sym_name" = v_symptom_record.name;

        IF v_current_symptom_id IS NULL THEN
            v_current_symptom_id := gen_random_uuid();
            INSERT INTO "tbl_symptom" ("symptom_id", "sym_name", "sym_description")
            VALUES (v_current_symptom_id, v_symptom_record.name, v_symptom_record.description);
        END IF;

        -- b. Crear la relación en tbl_treatment
        INSERT INTO "tbl_treatment" ("herb_id", "symptom_id", "tre_parts_plant", "tre_prepare", "tre_apply")
        VALUES (v_herb_id, v_current_symptom_id, v_symptom_record.parts_plant, v_symptom_record.prepare, v_symptom_record.apply)
        ON CONFLICT ("herb_id", "symptom_id") DO UPDATE 
        SET "tre_prepare" = EXCLUDED.tre_prepare, 
        	"tre_parts_plant" = EXCLUDED.tre_parts_plant, 
            "tre_apply" = EXCLUDED.tre_apply;

        v_created_count := v_created_count + 1;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'herb_id', v_herb_id,
        'symptoms_processed', v_created_count,
        'message', 'Planta y ' || v_created_count || ' síntomas procesados correctamente.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'status', 'error',
        'message', SQLERRM
    );
END;
$body$ LANGUAGE plpgsql;