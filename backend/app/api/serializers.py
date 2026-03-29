from typing import TypeVar

from pydantic import BaseModel


SchemaT = TypeVar("SchemaT", bound=BaseModel)


def to_schema(schema: type[SchemaT], value: object) -> SchemaT:
    return schema.model_validate(value)


def to_schema_list(schema: type[SchemaT], values: list[object]) -> list[SchemaT]:
    return [schema.model_validate(value) for value in values]
