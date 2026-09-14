-- O item de preferência precisa dizer de quem ele é.
--
-- A migration 0045 criou `user_preference_items` com `org_id` mas sem
-- `user_id`. A shape do Electric filtra pelo que a tabela tem: sem esta
-- coluna, a sincronização entregaria a qualquer pessoa da organização os
-- itens de preferência de todas as outras. Preferência é dado pessoal — a
-- mesma regra que `user_preferences` já seguia.

ALTER TABLE user_preference_items ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

UPDATE user_preference_items i
SET user_id = p.user_id
FROM user_preferences p
WHERE p.id = i.preference_id;

DELETE FROM user_preference_items WHERE user_id IS NULL;
ALTER TABLE user_preference_items ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX user_preference_items_user_idx ON user_preference_items (org_id, user_id, preference_id, sort_order);
