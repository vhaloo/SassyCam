import unittest
from src.core.model_registry import ModelRegistry, AIModel

class TestModelRegistry(unittest.TestCase):
    def test_get_models_for_provider(self):
        models = ModelRegistry.get_models_for_provider("Gemini")
        self.assertTrue(len(models) > 0)
        self.assertIsInstance(models[0], AIModel)
        self.assertEqual(models[0].provider, "Gemini")

    def test_get_models_invalid_provider(self):
        models = ModelRegistry.get_models_for_provider("InvalidProvider")
        self.assertEqual(models, [])

    def test_default_model(self):
        model = ModelRegistry.get_default_model("OpenAI")
        self.assertTrue(model.startswith("gpt-"))

    def test_experimental_flag(self):
        models = ModelRegistry.get_models_for_provider("Gemini")
        # Find 2.5 flash
        experimental = next((m for m in models if m.is_experimental), None)
        self.assertIsNotNone(experimental)
        self.assertTrue("Experimental" in experimental.name)

if __name__ == '__main__':
    unittest.main()
