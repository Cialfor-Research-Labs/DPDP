import subprocess
import sys
from pathlib import Path


PROJECT_NAME = "DPDP"
BASE_BRANCH = "main"


def run_command(command, error_message):
    """
    Execute shell commands safely across Windows, Linux, and macOS.
    """

    try:
        result = subprocess.run(
            command,
            check=True,
            text=True,
            capture_output=True
        )

        if result.stdout.strip():
            print(result.stdout.strip())

        return result

    except subprocess.CalledProcessError as e:
        print(f"\nERROR: {error_message}")

        if e.stderr:
            print(e.stderr.strip())

        sys.exit(1)

    except FileNotFoundError:
        print(
            f"\nERROR: Command not found -> {command[0]}\n"
            f"Ensure it is installed and added to PATH."
        )
        sys.exit(1)


def main():

    print("\n========================================")
    print(f" {PROJECT_NAME} Push + PR Tool")
    print("========================================\n")

    # -----------------------------------
    # USER INPUTS
    # -----------------------------------

    commit_message = input("Enter commit message: ").strip()
    pr_title = input("Enter PR title: ").strip()
    pr_body = input("Enter PR body: ").strip()

    if not commit_message:
        print("ERROR: Commit message cannot be empty.")
        sys.exit(1)
    if not pr_title:
        print("ERROR: PR title cannot be empty.")
        sys.exit(1)
    if not pr_body:
        print("ERROR: PR body cannot be empty.")
        sys.exit(1)

    # -----------------------------------
    # VERIFY GIT REPOSITORY
    # -----------------------------------

    if not Path(".git").exists():
        print("ERROR: Current directory is not a Git repository.")
        sys.exit(1)

    # Detect current branch for push
    current_branch_result = run_command(
        ["git", "branch", "--show-current"],
        "Failed to detect current branch."
    )
    current_branch = current_branch_result.stdout.strip()

    if not current_branch:
        print(
            "\nERROR: Could not determine current branch. "
            "Ensure you are on a valid branch."
        )
        sys.exit(1)

    print(f"\nUsing current branch -> {current_branch}")

    # -----------------------------------
    # STAGE FILES
    # -----------------------------------

    print("\nAdding files to git...")

    run_command(
        ["git", "add", "."],
        "Failed to add files."
    )

    print("SUCCESS: Files added.")

    # -----------------------------------
    # CREATE COMMIT
    # -----------------------------------

    print("\nCreating commit...")

    run_command(
        ["git", "commit", "-m", commit_message],
        "Failed to create commit."
    )

    print("SUCCESS: Commit created.")

    # -----------------------------------
    # PUSH CODE
    # -----------------------------------

    print("\nPushing code to GitHub...")

    run_command(
        ["git", "push", "origin", current_branch],
        "Failed to push code."
    )

    print("SUCCESS: Code pushed to GitHub.")

    # -----------------------------------
    # CREATE PULL REQUEST
    # Requires GitHub CLI
    # -----------------------------------

    print("\nCreating Pull Request...")

    run_command(
        [
            "gh",
            "pr",
            "create",
            "--title",
            pr_title,
            "--body",
            pr_body,
            "--base",
            BASE_BRANCH
        ],
        (
            "Failed to create Pull Request.\n"
            "Ensure GitHub CLI is installed and authenticated.\n"
            "Install GitHub CLI: https://cli.github.com/"
        )
    )

    print("\nSUCCESS: Pull Request created.")

    print("\n========================================")
    print(" Workflow Completed Successfully")
    print("========================================\n")


if __name__ == "__main__":
    main()
