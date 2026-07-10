import subprocess
import sys
from pathlib import Path


PROJECT_KEY = "DPDP"
BASE_BRANCH = "main"


def run_command(command, error_message):
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
    except subprocess.CalledProcessError as exc:
        print(f"\nERROR: {error_message}")
        if exc.stderr:
            print(exc.stderr.strip())
        sys.exit(1)
    except FileNotFoundError:
        print(
            f"\nERROR: Command not found -> {command[0]}\n"
            "Ensure it is installed and available in PATH."
        )
        sys.exit(1)


def prompt_yes_no(message, default_yes=True):
    suffix = "[Y/n]" if default_yes else "[y/N]"
    while True:
        answer = input(f"{message} {suffix}: ").strip().lower()
        if not answer:
            return default_yes
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("Please enter yes or no.")


def find_matching_remote_branch(jira_id):
    result = run_command(
        ["git", "branch", "-r"],
        "Failed to list remote branches."
    )
    remote_branches = [
        line.strip().replace("origin/", "", 1)
        for line in result.stdout.splitlines()
        if line.strip().startswith("origin/")
    ]
    remote_branches = [b for b in remote_branches if b != "HEAD -> origin/full_code"]

    jira_lower = jira_id.lower()

    exact_prefix = [
        b for b in remote_branches
        if b.lower().startswith(f"{jira_lower}-")
    ]
    contains_match = [b for b in remote_branches if jira_lower in b.lower()]

    if exact_prefix:
        return exact_prefix[0]
    if contains_match:
        return contains_match[0]
    return None


def local_branch_exists(branch_name):
    result = subprocess.run(
        ["git", "show-ref", "--verify", "--quiet", f"refs/heads/{branch_name}"]
    )
    return result.returncode == 0


def origin_remote_exists():
    result = subprocess.run(
        ["git", "remote"],
        text=True,
        capture_output=True,
        check=False
    )
    remotes = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return "origin" in remotes


def main():
    print("\n========================================")
    print(f" {PROJECT_KEY} Jira Branch Sync Tool")
    print("========================================\n")

    jira_id = input(f"Enter Jira ID (Example: {PROJECT_KEY}-1): ").strip().upper()
    stash_created = False

    if not jira_id:
        print("ERROR: Jira ID cannot be empty.")
        sys.exit(1)

    if not jira_id.startswith(f"{PROJECT_KEY}-"):
        print(f"ERROR: Jira ID must start with {PROJECT_KEY}- (for example: {PROJECT_KEY}-1).")
        sys.exit(1)

    if not Path(".git").exists():
        print("ERROR: Current directory is not a Git repository.")
        sys.exit(1)

    if not origin_remote_exists():
        print(
            "ERROR: Git remote 'origin' is not configured.\n"
            "Add it first, for example:\n"
            "  git remote add origin <repo-url>\n"
            "Then run this tool again."
        )
        sys.exit(1)

    print("\nFetching latest branches from GitHub...")
    run_command(["git", "fetch", "--all"], "Failed to fetch latest branches.")

    print("\nSearching for matching Jira branch...")
    matching_branch = find_matching_remote_branch(jira_id)

    if not matching_branch:
        print(f"\nERROR: No remote branch found for Jira ID {jira_id}.")
        sys.exit(1)

    print(f"SUCCESS: Found branch -> {matching_branch}")

    status_result = run_command(
        ["git", "status", "--porcelain"],
        "Failed to check git status."
    )
    has_local_changes = bool(status_result.stdout.strip())

    if has_local_changes:
        print("\nUncommitted changes detected in working tree.")
        should_stash = prompt_yes_no(
            "Stash local changes temporarily before branch switch?",
            default_yes=True
        )
        if not should_stash:
            print(
                "\nERROR: Aborted to avoid losing local changes during checkout."
            )
            sys.exit(1)

        run_command(
            ["git", "stash", "push", "-u", "-m", f"auto-stash before syncing {jira_id}"],
            "Failed to stash local changes."
        )
        stash_created = True
        print("SUCCESS: Local changes stashed.")

    print(f"\nSwitching to branch -> {matching_branch}")
    if local_branch_exists(matching_branch):
        run_command(
            ["git", "checkout", matching_branch],
            f"Failed to checkout local branch {matching_branch}."
        )
    else:
        run_command(
            ["git", "checkout", "-b", matching_branch, f"origin/{matching_branch}"],
            f"Failed to create local tracking branch {matching_branch}."
        )
    print(f"SUCCESS: On branch -> {matching_branch}")

    print(f"\nPulling latest code from origin/{BASE_BRANCH} into {matching_branch}...")
    run_command(
        ["git", "pull", "origin", BASE_BRANCH],
        f"Failed to pull from origin/{BASE_BRANCH}."
    )
    print(f"SUCCESS: Latest {BASE_BRANCH} changes pulled.")

    if stash_created:
        print("\nRestoring stashed changes...")
        run_command(
            ["git", "stash", "pop"],
            (
                "Failed to restore stashed changes.\n"
                "Use 'git stash list' and 'git stash pop' manually after resolving conflicts."
            )
        )
        print("SUCCESS: Stashed changes restored.")

    print("\n========================================")
    print(" Branch Sync Completed Successfully")
    print("========================================\n")


if __name__ == "__main__":
    main()
