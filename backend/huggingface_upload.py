from huggingface_hub import HfApi

hftoken = input("Your huggingface token: ")

hfusername = input("Huggingface username: ")

api = HfApi(token=hftoken)

api.upload_folder(
    folder_path="weights",
    repo_id=f"{hfusername}/paplens-weights",
    repo_type="model",
    ignore_patterns=["*.gitkeep"]
    )
print("Upload completed successfully.")
