import { HStack, VStack, Text, Checkbox } from "@hope-ui/solid"
import { batch, createEffect, createSignal, For, Show } from "solid-js"
import { useT } from "~/hooks"
import {
  allChecked,
  checkboxOpen,
  isIndeterminate,
  objStore,
  selectAll,
  sortObjs,
} from "~/store"
import { OrderBy } from "~/store"
import { Col, cols, ListItem } from "./ListItem"
import { useLocalStorage } from "solidjs-use"

const ListLayout = () => {
  const t = useT()
  const [state, setState] = useLocalStorage("list-order", {
    orderBy: "",
    reverse: false,
  })

  createEffect(() => {
    if (state().orderBy) {
      sortObjs(state().orderBy as OrderBy, state().reverse)
    }
  })
  const itemProps = (col: Col) => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: col.textAlign as any,
      cursor: "pointer",
      onClick: () => {
        if (col.name === state().orderBy) {
          setState({
            orderBy: col.name as OrderBy,
            reverse: !state().reverse,
          })
        } else {
          batch(() => {
            setState({
              orderBy: col.name as OrderBy,
              reverse: false,
            })
          })
        }
      },
    }
  }
  const orderSymbol = (col: Col) => {
    return state().orderBy == col.name ? (state().reverse ? "↑" : "↓") : ""
  }
  return (
    <VStack class="list" w="$full" spacing="$1">
      <HStack class="title" w="$full" p="$2">
        <HStack w={cols[0].w} spacing="$1">
          <Show when={checkboxOpen()}>
            <Checkbox
              checked={allChecked()}
              indeterminate={isIndeterminate()}
              onChange={(e: any) => {
                selectAll(e.target.checked as boolean)
              }}
            />
          </Show>
          <Text {...itemProps(cols[0])}>
            {orderSymbol(cols[0]) + t(`home.obj.${cols[0].name}`)}
          </Text>
        </HStack>
        <Text w={cols[1].w} {...itemProps(cols[1])}>
          {orderSymbol(cols[1]) + t(`home.obj.${cols[1].name}`)}
        </Text>
        <Text
          w={cols[2].w}
          {...itemProps(cols[2])}
          display={{ "@initial": "none", "@md": "inline" }}
        >
          {orderSymbol(cols[2]) + t(`home.obj.${cols[2].name}`)}
        </Text>
      </HStack>
      <For each={objStore.objs}>
        {(obj, i) => {
          return <ListItem obj={obj} index={i()} />
        }}
      </For>
    </VStack>
  )
}

export default ListLayout
