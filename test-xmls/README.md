# 📁 Arquivos XML para Teste de Importação

## 🎯 Arquivos Disponíveis para Teste

### 1. **Nfe_33250916590234006450550040008839141609288930_9101688151.xml**
- **Fornecedor:** AZZAS 2154 S.A (CNPJ: 16590234006450)
- **NFe:** 883914
- **Valor:** R$ 3.146,00
- **Data:** 2025-09-23

### 2. **Nfe_33250916590234006450550040008804951917719840_9073460675.xml**
- **Fornecedor:** AZZAS 2154 S.A (CNPJ: 16590234006450)
- **NFe:** 880495
- **Valor:** R$ 2.014,00
- **Data:** 2025-09-19

### 3. **Nfe_33250916590234006450550040008778691535913168_9053740726.xml**
- **Fornecedor:** AZZAS 2154 S.A (CNPJ: 16590234006450)
- **NFe:** 877869
- **Valor:** R$ 2.009,00
- **Data:** 2025-09-16

### 4. **Nfe_42250983938985000128550020002280771010302988_9066755862.xml**
- **Fornecedor:** [A ser identificado no teste]
- **NFe:** [A ser identificado no teste]
- **Valor:** [A ser identificado no teste]
- **Data:** [A ser identificado no teste]

## 🧪 Como Testar

1. **Acesse:** http://localhost:8080/compras/importar-xml
2. **Selecione:** Um ou mais arquivos XML desta pasta
3. **Importe:** Clique em "Importar" e acompanhe o processo
4. **Verifique:** Se as contas a pagar foram criadas corretamente

## ✅ Resultados Esperados

- ✅ Parsing correto dos dados XML
- ✅ Criação/verificação automática de fornecedores
- ✅ Geração de contas a pagar com valores corretos
- ✅ Verificação de duplicatas
- ✅ Feedback visual do processo

## 📊 Total de Teste

**Valor total dos primeiros 3 arquivos:** R$ 7.169,00
**Total de arquivos:** 4 XMLs

---

**Status:** ✅ Sistema validado e pronto para teste real na interface!
