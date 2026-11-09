Set-Location C:\Users\ASUS\VatLy11
Remove-Item tfin.txt,lfin.txt,cfin.txt,bd.txt -ErrorAction SilentlyContinue
npx tsc --noEmit > tfin.txt 2>&1
"TSCEXIT:$LASTEXITCODE" | Add-Content bd.txt
npx eslint src > lfin.txt 2>&1
"LINTEXIT:$LASTEXITCODE" | Add-Content bd.txt
npm run test:content > cfin.txt 2>&1
"CONTENTEXIT:$LASTEXITCODE" | Add-Content bd.txt
"ALLDONE" | Add-Content bd.txt