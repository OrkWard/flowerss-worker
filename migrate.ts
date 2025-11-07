const kv = await Deno.openKv();

await kv.set(["users"], [{ id: 1463278815, first_name: "OrkWard" }]);
