tableのviewの union, lookup, filter がいま別々になってるのが使い勝手がよくないです。
これを統合することはできますか？

viewを設定するUIはいったん棚上げして、SQLのようなものを設計して

1. SQLライク

```
select e.name, e.hp, e.dropItemId, i.name, i.value from enemy as e join item as i on e.dropItemId == i.id;
```

2. 独自形式

SQLだと自由度が高すぎるので、より狭い自由度の表現を作成する.

```
table(enemy:e, item:i by e.dropItemId) 
  column(e.name, e.hp, e.dropItemId, i.name, i.value);
```

```
table(enemy:e)
  column(e.name, e.hp)
  filter(e.hp > 10 and e.attack > 30);
```
