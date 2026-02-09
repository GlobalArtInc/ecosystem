import { type Option } from "@globalart/oxide";
import { ValueObject } from "../value-objects/value-object";
import {
  type IFilter,
  type IRootFilter,
  convertFilterSpec,
  isGroup,
} from "./filter";
import { type BaseFilterSpecification } from "./filter-specification.base";

export class RootFilter<T extends IFilter = IFilter> extends ValueObject<
  IRootFilter<T>
> {
  get value() {
    return this.props;
  }

  get group() {
    if (Array.isArray(this.value)) {
      return { conjunction: "$and", children: this.value };
    }
    if (isGroup(this.value)) {
      return this.value;
    }

    return { conjunction: "$and", children: [this.value] };
  }

  getSpec(): Option<BaseFilterSpecification> {
    return convertFilterSpec(this.value);
  }

  public toJSON() {
    return this.props;
  }
}
