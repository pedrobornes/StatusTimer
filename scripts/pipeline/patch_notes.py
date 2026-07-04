"""AI patch-note extraction pipeline skeleton (Task 2)."""

BLACKWATCH_PATCH_PROMPT = """Analyze the following raw game patch notes. Extract the core bullet points.
Retain all strict numerical balance modifications, bug fixes, and infrastructure changes.
Format the output in high-contrast tactical markdown language.

RAW PATCH NOTES:
{raw_text}
"""


def summarize_patch_notes(raw_text: str) -> str:
    """
    Pass raw announcement text through the Blackwatch tactical intel prompt.

    TODO: Wire this hook to Ollama / LangChain once the harvest loop is connected.
    """
    if not raw_text.strip():
        raise ValueError("Patch note source text cannot be empty.")

    return BLACKWATCH_PATCH_PROMPT.format(raw_text=raw_text.strip())
