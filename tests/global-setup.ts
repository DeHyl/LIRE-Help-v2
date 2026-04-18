import { closeDb } from "./helpers/seed.js";

export default function setup() {
  return async () => {
    await closeDb();
  };
}
