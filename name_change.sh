# from repo root
grep -RIl "Blueprint Estimator Hub" frontend backend DEPLOY.md \
| xargs sed -i '' 's/Blueprint Estimator Hub/SkyBuild Pro/g'
# Optional package name change
sed -i '' 's/"blueprint-estimator-frontend"/"skybuild-pro-frontend"/' frontend/package.json
