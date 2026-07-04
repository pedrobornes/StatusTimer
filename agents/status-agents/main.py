import os
import json
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

# 1. Inicializamos el Ferrari (DeepSeek)
print("🤖 Cargando DeepSeek-Coder-V2...")
llm = OllamaLLM(
    base_url="http://localhost:11434",
    model="deepseek-coder-v2:16b",
    temperature=0.0  # Temperatura 0 para que sea preciso y no invente nada
)

# 2. Simulamos el texto "sucio" que rascaríamos de una web o de redes sociales
texto_servidor_sucio = """
[UPDATE 17:30 UTC] We are investigating an issue preventing players from logging into Fortnite matchmaker. 
Game servers are currently undergoing emergency maintenance. 
Estimated downtime: 2 hours. Shop and website are operational.
"""

# 3. Diseñamos la plantilla de instrucciones (Prompt Engineering) profesional
prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "Eres un agente especializado en extraer datos de servidores de videojuegos.\n"
        "Tu objetivo es analizar el texto proporcionado y responder EXCLUSIVAMENTE con un objeto JSON válido.\n"
        "No agregues introducciones, ni explicaciones, ni bloques de código markdown (```json). Solo el JSON puro.\n"
        "El formato del JSON debe ser exactamente el siguiente:\n"
        "{{\n"
        '  "juego": "Nombre del juego",\n'
        '  "estado": "DOWN" o "UP" o "MAINTENANCE",\n'
        '  "detalles": "Breve resumen en español del problema",\n'
        '  "tiempo_estimado_minutos": número entero o null\n'
        "}}\n"
    )),
    ("user", "Analiza el siguiente texto:\n\n{texto}")
])

# 4. Unimos las piezas en una cadena (Chain) de LangChain
cadena = prompt | llm

print("🚀 El agente está analizando los servidores de Fortnite...")

try:
    # Ejecutamos el agente pasándole el texto sucio
    respuesta_raw = cadena.invoke({"texto": texto_servidor_sucio}).strip()
    
    # TRUCO: Si la IA mete bloques de código markdown, se los limpiamos antes de parsear
    if respuesta_raw.startswith("```"):
        # Quitamos la línea de apertura (```json o ```) y la de cierre (```)
        lineas = respuesta_raw.splitlines()
        if lineas[0].startswith("```"):
            lineas = lineas[1:]
        if lineas[-1].startswith("```"):
            lineas = lineas[:-1]
        respuesta_raw = "\n".join(lineas).strip()
    
    # Intentamos parsear la respuesta limpia
    datos_limpios = json.loads(respuesta_raw)
    
    print("\n✨ ¡Éxito! El agente ha generado un JSON perfecto para Spring Boot:")
    print(json.dumps(datos_limpios, indent=2, ensure_ascii=False))
    
except json.JSONDecodeError:
    print("\n⚠️ La IA no devolvió un JSON perfectamente limpio. Respuesta raw:")
    print(respuesta_raw)
except Exception as e:
    print(f"\n❌ Error inesperado: {e}")