SELECT fn_create_herb_with_symptoms_bulk(
    'Jengibre', 
    'Raíz picante con propiedades antiinflamatorias', 
    'jengibre.png',
    '[
        {
            "name": "Náuseas", 
            "description": "Sensación de malestar estomacal", 
            "prepare": "Masticar un trozo pequeño",
			"tre_parts_plant": "Tallo",
            "apply": "Directo"
        },
        {
            "name": "Dolor de Garganta", 
            "description": "Irritación por resfriado", 
            "prepare": "Té de jengibre con limón",
			"tre_parts_plant": "Hojas",
            "apply": "Gárgaras o bebida"
        }
    ]'::jsonb,
    'Suelos drenados',
    'No exceder 4g al día'
);