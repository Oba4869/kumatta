# クマの3Dモデルの作り方

`src/assets/bears/tsuki.glb` と `higuma.glb` は、次の手順で作っています。

1. 参考画像（ツキノワグマ・ヒグマの前と横）を Tripo（H2.5、無料プラン）に入れて、4頭入りの GLB を作る
2. Blender（Python の `bpy`）で 4頭をばらし、横向きの2頭を選んで面を約6000に減らす
3. 面ごとにテクスチャの色を1色にする。ツキノワグマの背中に混ざった茶色を黒に直し、胸の三日月を描き足す
4. ゲームのクマの骨組みに合わせて向きと大きさをそろえ、胴体と4本の脚に分けて書き出す

```
pip install bpy numpy pillow
python3 process.py bears.glb out 6000          # ばらして面を減らす
python3 export_game.py out fix.py .002 tsuki.glb   # ツキノワグマ
python3 export_game.py out fix.py base higuma.glb  # ヒグマ
```
