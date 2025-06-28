import { convertFilterSpec } from "@globalart/ddd";

console.log(convertFilterSpec({
  "conjunction": "$and",
  "children": [
    {
      "type": "string",
      "field": "accountId",
      "operator": "$eq",
      "value": "122159"
    },
    {
      "conjunction": "$and",
      "children": [
        {
          "type": "boolean",
          "operator": "$eq",
          "value": false,
          "field": "isCommon"
        }
      ]
    }
  ]
}))