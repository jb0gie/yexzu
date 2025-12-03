commit f39c16f987ddea731d8f38d578def7992d2df028
Author: peezy <itspeezy@protonmail.com>
Date:   Sun Nov 2 13:45:12 2025 -0300

    evm v1.0.7

diff --git a/src/core/systems/EVMServer.js b/src/core/systems/EVMServer.js
new file mode 100644
index 0000000..4e775fa
--- /dev/null
+++ b/src/core/systems/EVMServer.js
@@ -0,0 +1,53 @@
+import { createPublicClient, createWalletClient, erc20Abi, getContract, http } from 'viem'
+import { mnemonicToAccount } from 'viem/accounts'
+import * as utils from 'viem/utils'
+import * as chains from 'viem/chains'
+import { System } from './System'
+
+export class EVM extends System {
+  constructor(world) {
+    super(world)
+    this.evm = null
+
+    const chainName = process.env.PUBLIC_EVM ?? 'mainnet'
+    const chain = chains[chainName]
+
+    if (!chain) throw new Error('invalid chain string')
+
+    if (world.network.isServer) {
+      const account = mnemonicToAccount(process.env.EVM_SEED_PHRASE)
+
+      const wallet = createWalletClient({
+        account,
+        chain,
+        transport: http(),
+      })
+
+      const client = createPublicClient({
+        chain,
+        transport: http(),
+      })
+
+      this.utils = utils
+      this.actions = client
+      this.wallet = wallet
+      this.getContract = getContract
+      this.abis = {
+        erc20: erc20Abi,
+        erc721: null,
+      }
+    }
+  }
+
+  onEvmConnect(socket, address) {
+    socket.player.data.evm = address
+    socket.player.modify({ evm: address })
+    this.world.network.send('entityModified', { id: socket.player.data.id, evm: address })
+  }
+
+  onEvmDisconnect(socket) {
+    socket.player.data.evm = null
+    socket.player.modify({ evm: null })
+    this.world.network.send('entityModified', { id: socket.player.data.id, evm: null })
+  }
+}
