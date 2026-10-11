import { adminOnly } from "./admin";
import { type CardInput, getCards, removeCard, writeCard } from "./cards.server";
import { createServerFn } from "@tanstack/react-start";

export const loadCards = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .handler(() => getCards());

export const saveCard = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((input: CardInput) => input)
  .handler(({ data }) => writeCard(data));

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((id: string) => id)
  .handler(({ data }) => removeCard(data));
