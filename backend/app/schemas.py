from typing import Literal, Optional

from pydantic import BaseModel, Field

Difficulty = Literal["beginner", "intermediate", "advanced"]
Status = Literal["active", "paused", "archived"]


class ProjectIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    repo_url: Optional[str] = None
    category_id: Optional[int] = None
    difficulty: Difficulty = "beginner"
    status: Status = "active"
    stars: int = Field(0, ge=0)
    required_skills: list[str] = []


class ProjectPatch(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    repo_url: Optional[str] = None
    category_id: Optional[int] = None
    difficulty: Optional[Difficulty] = None
    status: Optional[Status] = None
    stars: Optional[int] = Field(None, ge=0)
    required_skills: Optional[list[str]] = None


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = None


class IssueIn(BaseModel):
    title: str = Field(min_length=1, max_length=250)
    description: Optional[str] = None
    label: str = "general"
    status: Literal["open", "in_progress", "closed"] = "open"


class IssuePatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    label: Optional[str] = None
    status: Optional[Literal["open", "in_progress", "closed"]] = None


class ContributionIn(BaseModel):
    developer_id: Optional[int] = None  # ignored; authenticated session determines the contributor
    issue_id: Optional[int] = None
    type: Literal["code", "docs", "review", "bug_report"] = "code"
    status: Literal["submitted", "merged", "rejected"] = "submitted"
    lines_changed: int = Field(0, ge=0)


class ContributionStatus(BaseModel):
    status: Literal["submitted", "merged", "rejected"]
